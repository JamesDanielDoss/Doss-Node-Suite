import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "DossImageComparer";
const DEFAULT_MODE = "Side By Side";
const MODES = new Set(["Side By Side", "Slide", "Click"]);

function makeImageUrl(imageData) {
  const params = new URLSearchParams({
    filename: imageData.filename || "",
    type: imageData.type || "temp",
    subfolder: imageData.subfolder || "",
  });
  const preview = app.getPreviewFormatParam?.() || "";
  const cacheBust = app.getRandParam?.() || "";
  return api.apiURL(`/view?${params.toString()}${preview}${cacheBust}`);
}

function getMode(node, outputMode) {
  const widgetMode = node.widgets?.find((widget) => widget.name === "comparer_mode")?.value;
  const mode = Array.isArray(outputMode) ? outputMode[0] : widgetMode;
  return MODES.has(mode) ? mode : DEFAULT_MODE;
}

function buildImageEntries(output) {
  const images = [];
  const aImages = output?.a_images || [];
  const bImages = output?.b_images || [];

  if (aImages.length || bImages.length) {
    for (const [index, imageData] of aImages.entries()) {
      images.push({
        label: aImages.length > 1 ? `A${index + 1}` : "A",
        url: makeImageUrl(imageData),
      });
    }
    for (const [index, imageData] of bImages.entries()) {
      images.push({
        label: bImages.length > 1 ? `B${index + 1}` : "B",
        url: makeImageUrl(imageData),
      });
    }
    return images;
  }

  for (const [index, imageData] of (output?.images || []).entries()) {
    images.push({
      label: index === 0 ? "A" : "B",
      url: makeImageUrl(imageData),
    });
  }
  return images;
}

function fitRect(image, x, y, width, height) {
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const boundsAspect = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (imageAspect > boundsAspect) {
    drawHeight = width / imageAspect;
  } else {
    drawWidth = height * imageAspect;
  }

  return {
    x: x + (width - drawWidth) / 2,
    y: y + (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

function drawPanel(ctx, x, y, width, height) {
  ctx.fillStyle = "rgba(20, 20, 24, 0.88)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.strokeRect(x, y, width, height);
}

function drawLabel(ctx, text, x, y) {
  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(text, x + 8, y + 7);
  ctx.restore();
}

function drawPlaceholder(ctx, text, x, y, width, height) {
  drawPanel(ctx, x, y, width, height);
  ctx.save();
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.fillText(text, x + width / 2, y + height / 2);
  ctx.restore();
}

function drawImageInBounds(ctx, entry, x, y, width, height) {
  drawPanel(ctx, x, y, width, height);
  const image = entry?.image;
  if (!image?.naturalWidth || !image?.naturalHeight) {
    drawPlaceholder(ctx, entry ? "Loading image..." : "No image", x, y, width, height);
    return;
  }

  const rect = fitRect(image, x, y, width, height);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  drawLabel(ctx, entry.label, x, y);
}

class DossImageComparerWidget {
  constructor(node) {
    this.name = "doss_image_comparer";
    this.type = "custom";
    this.node = node;
    this.mode = DEFAULT_MODE;
    this.entries = [];
  }

  set value(value) {
    this.mode = getMode(this.node, value?.mode);
    this.entries = (value?.images || []).slice(0, 2).map((entry) => {
      const image = new Image();
      image.onload = () => this.node.setDirtyCanvas?.(true, true);
      image.onerror = () => this.node.setDirtyCanvas?.(true, true);
      image.src = entry.url;
      return { ...entry, image };
    });
    this.node.imgs = this.entries.map((entry) => entry.image);
    this.node.setDirtyCanvas?.(true, true);
  }

  get value() {
    return {
      mode: this.mode,
      images: this.entries.map((entry) => ({
        label: entry.label,
        url: entry.url,
      })),
    };
  }

  draw(ctx, node, width, y) {
    const height = this.computeSize(width)[1] - 8;
    const x = 0;
    const top = y + 4;
    const mode = getMode(node, this.mode);

    if (mode === "Slide") {
      this.drawSlide(ctx, node, x, top, width, height);
    } else if (mode === "Click") {
      this.drawClick(ctx, node, x, top, width, height);
    } else {
      this.drawSideBySide(ctx, x, top, width, height);
    }
  }

  drawSideBySide(ctx, x, y, width, height) {
    const gap = 8;
    const panelWidth = (width - gap) / 2;
    const imageA = this.entries[0];
    const imageB = this.entries[1] || this.entries[0];

    drawImageInBounds(ctx, imageA, x, y, panelWidth, height);
    drawImageInBounds(ctx, imageB, x + panelWidth + gap, y, panelWidth, height);
  }

  drawSlide(ctx, node, x, y, width, height) {
    const imageA = this.entries[0];
    const imageB = this.entries[1];

    drawImageInBounds(ctx, imageA, x, y, width, height);
    if (!imageB?.image?.naturalWidth || !imageB?.image?.naturalHeight) {
      drawLabel(ctx, "Slide: connect image_b or use a batch", x, y);
      return;
    }

    const pointerX = Number.isFinite(node.dossComparerPointerX)
      ? node.dossComparerPointerX
      : width / 2;
    const cropX = Math.max(0, Math.min(width, pointerX));
    const rect = fitRect(imageB.image, x, y, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cropX, height);
    ctx.clip();
    ctx.drawImage(imageB.image, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cropX, y);
    ctx.lineTo(cropX, y + height);
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, "Slide", x, y);
  }

  drawClick(ctx, node, x, y, width, height) {
    // TODO: Add persistent A/B selection controls after the proof-of-work display is stable.
    const entry = node.dossComparerPointerDown && this.entries[1] ? this.entries[1] : this.entries[0];
    drawImageInBounds(ctx, entry, x, y, width, height);
    drawLabel(ctx, node.dossComparerPointerDown ? "Click: B" : "Click: A", x, y);
  }

  computeSize(width) {
    const targetWidth = Math.max(width || 360, 320);
    return [targetWidth, Math.max(220, Math.round(targetWidth * 0.62))];
  }

  serializeValue() {
    return this.value;
  }
}

app.registerExtension({
  name: "doss.imageComparer",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) {
      return;
    }

    const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
    const originalOnExecuted = nodeType.prototype.onExecuted;
    const originalOnMouseMove = nodeType.prototype.onMouseMove;
    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    const originalOnMouseUp = nodeType.prototype.onMouseUp;
    const originalOnMouseLeave = nodeType.prototype.onMouseLeave;

    nodeType.prototype.onNodeCreated = function () {
      originalOnNodeCreated?.apply(this, arguments);
      try {
        this.dossComparerPointerX = this.size?.[0] ? this.size[0] / 2 : 180;
        this.dossComparerPointerDown = false;
        this.imageIndex = 0;
        this.imgs = [];
        this.dossComparerWidget = this.addCustomWidget(new DossImageComparerWidget(this));
        const width = Math.max(this.size?.[0] || 360, 360);
        const height = Math.max(this.size?.[1] || 280, 320);
        this.setSize?.([width, height]);
      } catch (error) {
        console.warn("[Doss Image Comparer] Frontend widget setup failed.", error);
      }
    };

    nodeType.prototype.onExecuted = function (output) {
      originalOnExecuted?.apply(this, arguments);
      try {
        this.dossComparerWidget.value = {
          mode: output?.comparer_mode,
          images: buildImageEntries(output),
        };
      } catch (error) {
        console.warn("[Doss Image Comparer] Could not render preview data.", error);
      }
    };

    nodeType.prototype.onMouseMove = function (event, pos, canvas) {
      originalOnMouseMove?.apply(this, arguments);
      this.dossComparerPointerX = pos?.[0] ?? this.dossComparerPointerX ?? this.size[0] / 2;
      this.imageIndex = this.dossComparerPointerX > this.size[0] / 2 ? 1 : 0;
      this.setDirtyCanvas?.(true, false);
    };

    nodeType.prototype.onMouseDown = function (event, pos, canvas) {
      const result = originalOnMouseDown?.apply(this, arguments);
      this.dossComparerPointerDown = true;
      this.imageIndex = 1;
      this.setDirtyCanvas?.(true, false);
      return result;
    };

    nodeType.prototype.onMouseUp = function (event, pos, canvas) {
      const result = originalOnMouseUp?.apply(this, arguments);
      this.dossComparerPointerDown = false;
      this.imageIndex = 0;
      this.setDirtyCanvas?.(true, false);
      return result;
    };

    nodeType.prototype.onMouseLeave = function (event) {
      originalOnMouseLeave?.apply(this, arguments);
      this.dossComparerPointerDown = false;
      this.setDirtyCanvas?.(true, false);
    };
  },
});
