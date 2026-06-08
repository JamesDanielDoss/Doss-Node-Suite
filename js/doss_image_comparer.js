import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "DossImageComparer";
const DEFAULT_MODE = "Side By Side";
const MODES = new Set(["Side By Side", "Slider"]);
const MIN_PREVIEW_WIDTH = 280;
const MIN_PREVIEW_HEIGHT = 160;
const PREVIEW_TOP_PADDING = 4;
const PREVIEW_BOTTOM_PADDING = 8;
const NODE_BOTTOM_PADDING = 12;

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

  for (const [index, imageData] of aImages.entries()) {
    images.push({
      inputName: "image_a",
      label: aImages.length > 1 ? `A${index + 1}` : "A",
      url: makeImageUrl(imageData),
    });
  }
  for (const [index, imageData] of bImages.entries()) {
    images.push({
      inputName: "image_b",
      label: bImages.length > 1 ? `B${index + 1}` : "B",
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

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawBadge(ctx, text, x, y, align = "left") {
  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.textBaseline = "top";

  const paddingX = 8;
  const paddingY = 5;
  const textWidth = ctx.measureText(text).width;
  const width = textWidth + paddingX * 2;
  const height = 22;
  const left = align === "right" ? x - width : x;

  drawRoundedRect(ctx, left, y, width, height, 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillText(text, left + paddingX, y + paddingY);
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

function drawImageInBounds(ctx, entry, x, y, width, height, showLabel = true) {
  if (width <= 0 || height <= 0) {
    return;
  }

  drawPanel(ctx, x, y, width, height);
  const image = entry?.image;
  if (!image?.naturalWidth || !image?.naturalHeight) {
    drawPlaceholder(ctx, entry ? "Loading image..." : "No image", x, y, width, height);
    return;
  }

  const rect = fitRect(image, x, y, width, height);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  if (showLabel) {
    drawLabel(ctx, entry.label, x, y);
  }
}

function getDefaultPreviewHeight(width) {
  return Math.max(
    MIN_PREVIEW_HEIGHT,
    Math.round(Math.max(width || MIN_PREVIEW_WIDTH, MIN_PREVIEW_WIDTH) * 0.56),
  );
}

function getPreviewHeight(node, width, y = 0) {
  const widthFallback = getDefaultPreviewHeight(width);
  const nodeHeight = Number(node?.size?.[1]);

  if (!Number.isFinite(nodeHeight)) {
    return widthFallback;
  }

  const availableHeight = nodeHeight - y - PREVIEW_TOP_PADDING - NODE_BOTTOM_PADDING;
  return Math.max(0, availableHeight);
}

function getInputEntry(entries, inputName) {
  return entries.find((entry) => entry.inputName === inputName);
}

function removeStaleSelectedImageOutput(node) {
  if (!Array.isArray(node.outputs)) {
    return;
  }

  for (let index = node.outputs.length - 1; index >= 0; index -= 1) {
    if (node.outputs[index]?.name === "selected_image") {
      node.disconnectOutput?.(index);
      node.outputs.splice(index, 1);
    }
  }
}

class DossImageComparerWidget {
  constructor(node) {
    this.name = "doss_image_comparer";
    this.type = "custom";
    this.node = node;
    this.mode = DEFAULT_MODE;
    this.entries = [];
    this.lastY = 0;
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
    this.node.setDirtyCanvas?.(true, true);
  }

  get value() {
    return {
      mode: this.mode,
      images: this.entries.map((entry) => ({
        inputName: entry.inputName,
        label: entry.label,
        url: entry.url,
      })),
    };
  }

  draw(ctx, node, width, y) {
    this.lastY = y;
    const height = getPreviewHeight(node, width, y);
    const x = 0;
    const top = y + PREVIEW_TOP_PADDING;
    const mode = getMode(node, this.mode);

    if (mode === "Slider") {
      this.drawSlider(ctx, node, x, top, width, height);
    } else {
      this.drawSideBySide(ctx, x, top, width, height);
    }
  }

  drawSideBySide(ctx, x, y, width, height) {
    const gap = 8;
    const panelWidth = Math.max(0, (width - gap) / 2);
    const imageA = getInputEntry(this.entries, "image_a");
    const imageB = getInputEntry(this.entries, "image_b") || imageA;

    drawImageInBounds(ctx, imageA, x, y, panelWidth, height);
    drawImageInBounds(ctx, imageB, x + panelWidth + gap, y, panelWidth, height);
  }

  drawSlider(ctx, node, x, y, width, height) {
    const imageA = getInputEntry(this.entries, "image_a");
    const imageB = getInputEntry(this.entries, "image_b") || imageA;

    drawImageInBounds(ctx, imageB, x, y, width, height, false);
    if (width <= 0 || height <= 0) {
      return;
    }
    if (!imageA?.image?.naturalWidth || !imageA?.image?.naturalHeight) {
      return;
    }

    const pointerX = Number.isFinite(node.dossComparerPointerX)
      ? node.dossComparerPointerX
      : width / 2;
    const cropX = Math.max(0, Math.min(width, pointerX));
    const rect = fitRect(imageA.image, x, y, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cropX, height);
    ctx.clip();
    ctx.drawImage(imageA.image, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cropX, y);
    ctx.lineTo(cropX, y + height);
    ctx.stroke();
    ctx.restore();

    const labelPadding = 8;
    drawBadge(ctx, "A: Original", x + labelPadding, y + labelPadding);
    drawBadge(ctx, "B: Result", x + width - labelPadding, y + labelPadding, "right");
  }

  computeSize(width) {
    const targetWidth = Math.max(width || 360, MIN_PREVIEW_WIDTH);
    return [targetWidth, MIN_PREVIEW_HEIGHT + PREVIEW_TOP_PADDING + PREVIEW_BOTTOM_PADDING];
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
    const originalOnConfigure = nodeType.prototype.onConfigure;
    const originalOnExecuted = nodeType.prototype.onExecuted;
    const originalOnMouseMove = nodeType.prototype.onMouseMove;
    const originalOnMouseLeave = nodeType.prototype.onMouseLeave;
    const originalOnResize = nodeType.prototype.onResize;

    nodeType.prototype.onNodeCreated = function () {
      originalOnNodeCreated?.apply(this, arguments);
      try {
        removeStaleSelectedImageOutput(this);
        this.dossComparerPointerX = this.size?.[0] ? this.size[0] / 2 : 180;
        this.dossComparerWidget = this.addCustomWidget(new DossImageComparerWidget(this));
        const width = Math.max(this.size?.[0] || 360, 360);
        const height = Math.max(this.size?.[1] || 280, 320);
        this.setSize?.([width, height]);
      } catch (error) {
        console.warn("[Doss Image Comparer] Frontend widget setup failed.", error);
      }
    };

    nodeType.prototype.onConfigure = function () {
      originalOnConfigure?.apply(this, arguments);
      removeStaleSelectedImageOutput(this);
    };

    nodeType.prototype.onExecuted = function (output) {
      originalOnExecuted?.apply(this, arguments);
      try {
        removeStaleSelectedImageOutput(this);
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
      this.setDirtyCanvas?.(true, false);
    };

    nodeType.prototype.onMouseLeave = function (event) {
      originalOnMouseLeave?.apply(this, arguments);
      this.setDirtyCanvas?.(true, false);
    };

    nodeType.prototype.onResize = function () {
      originalOnResize?.apply(this, arguments);
      this.setDirtyCanvas?.(true, true);
    };
  },
});
