import { app } from "../../scripts/app.js";

const NODE_TYPE = "DossCanvasLabel";
const DISPLAY_NAME = "Doss Canvas Label";
const CATEGORY = "⚡ Doss Node Suite";
const TRANSPARENT = "transparent";
const DEFAULT_SIZE = Object.freeze([360, 86]);
const MIN_SIZE = Object.freeze([80, 32]);
const BRAND_GREEN = "#69f58a";
const BRAND_WHITE = "#f7fff9";

function number(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function text(value, fallback = "") {
  const parsed = String(value ?? "").trim();
  return parsed || fallback;
}

function isTransparent(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "" || normalized === TRANSPARENT || normalized === "rgba(0,0,0,0)";
}

function setFillStyle(context, value, fallback) {
  try {
    context.fillStyle = value;
  } catch (_) {
    context.fillStyle = fallback;
  }
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.roundRect?.(x, y, width, height, safeRadius);
  if (!context.roundRect) {
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
  }
}

function decodedLines(value) {
  return String(value || "Doss Label")
    .replaceAll("\\n", "\n")
    .split(/\r?\n/);
}

function wrapLine(context, value, maxWidth) {
  if (context.measureText(value).width <= maxWidth) return [value];
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let current = words.shift();
  for (const word of words) {
    const candidate = `${current} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function layoutLines(context, node, width) {
  const padding = number(node.properties.padding, 6, 0, 80);
  const available = Math.max(10, width - padding * 2);
  const wrap = node.properties.wrap_text !== false;
  return decodedLines(node.title).flatMap((line) => (wrap ? wrapLine(context, line, available) : [line]));
}

function isSelected(node) {
  const selected = app.canvas?.selected_nodes;
  return Boolean(node.is_selected || selected?.[node.id] || selected?.[String(node.id)]);
}

function installTransparentShellPatch() {
  const prototype = window.LGraphCanvas?.prototype;
  if (!prototype?.drawNodeShape || prototype.__dossCanvasLabelShellPatch) return;

  prototype.__dossCanvasLabelShellPatch = true;
  const originalDrawNodeShape = prototype.drawNodeShape;
  prototype.drawNodeShape = function (node, context) {
    if (node?.type === NODE_TYPE) return;
    return originalDrawNodeShape.apply(this, arguments);
  };
}

function editLabel(node) {
  const current = String(node.title || "").replaceAll("\n", "\\n");
  const next = window.prompt("Doss Canvas Label text (use \\n for a new line):", current);
  if (next == null) return;
  node.title = next.trim() || "Doss Label";
  node.setDirtyCanvas?.(true, true);
}

function fitLabelToText(node) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  const fontSize = number(node.properties.font_size, 32, 8, 180);
  const fontWeight = text(node.properties.font_weight, "700");
  const fontFamily = text(node.properties.font_family, "Inter, Arial, sans-serif");
  const lineHeight = number(node.properties.line_height, 1.2, 0.8, 3);
  const padding = number(node.properties.padding, 6, 0, 80);
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const lines = decodedLines(node.title);
  const measuredWidth = Math.max(...lines.map((line) => context.measureText(line).width), MIN_SIZE[0]);
  node.setSize?.([
    Math.ceil(measuredWidth + padding * 2 + 4),
    Math.ceil(lines.length * fontSize * lineHeight + padding * 2 + 4),
  ]);
  node.setDirtyCanvas?.(true, true);
}

app.registerExtension({
  name: "Doss.CanvasLabel",
  async setup() {
    installTransparentShellPatch();
  },
  registerCustomNodes() {
    installTransparentShellPatch();
    const LGraphNodeBase = window.LGraphNode;
    const LiteGraphApi = window.LiteGraph;
    if (!LGraphNodeBase || !LiteGraphApi?.registerNodeType) {
      console.warn("[Doss Canvas Label] LiteGraph is unavailable; the label was not registered.");
      return;
    }

    class DossCanvasLabel extends LGraphNodeBase {
      constructor(title) {
        super(title || "Doss Label");
        this.title = title || "Doss Label";
        this.isVirtualNode = true;
        this.serialize_widgets = false;
        this.resizable = true;
        this.color = "rgba(0,0,0,0)";
        this.bgcolor = "rgba(0,0,0,0)";
        this.boxcolor = "rgba(0,0,0,0)";
        this.addProperty("font_size", 32, "number", { min: 8, max: 180, step: 1 });
        this.addProperty("font_family", "Inter, Arial, sans-serif", "string");
        this.addProperty("font_weight", "700", "combo", {
          values: ["400", "500", "600", "700", "800", "900"],
        });
        this.addProperty("font_color", BRAND_WHITE, "string");
        this.addProperty("text_align", "left", "combo", {
          values: ["left", "center", "right"],
        });
        this.addProperty("line_height", 1.2, "number", { min: 0.8, max: 3, step: 0.05 });
        this.addProperty("wrap_text", true, "boolean");
        this.addProperty("background_color", TRANSPARENT, "string");
        this.addProperty("padding", 6, "number", { min: 0, max: 80, step: 1 });
        this.addProperty("border_radius", 10, "number", { min: 0, max: 80, step: 1 });
        this.setSize?.([...DEFAULT_SIZE]);
      }

      getTitle() {
        return "";
      }

      onResize(size) {
        size[0] = Math.max(MIN_SIZE[0], Number(size[0]) || DEFAULT_SIZE[0]);
        size[1] = Math.max(MIN_SIZE[1], Number(size[1]) || DEFAULT_SIZE[1]);
        this.setDirtyCanvas?.(true, true);
      }

      onDblClick() {
        editLabel(this);
        return true;
      }

      onPropertyChanged() {
        this.setDirtyCanvas?.(true, true);
        return true;
      }

      getExtraMenuOptions(_, options) {
        options.unshift(
          {
            content: "Edit Doss Label",
            callback: () => editLabel(this),
          },
          {
            content: "Fit Label to Text",
            callback: () => fitLabelToText(this),
          },
          null,
        );
      }

      onDrawForeground(context) {
        if (this.flags?.collapsed) return;
        const width = Math.max(MIN_SIZE[0], Number(this.size?.[0]) || DEFAULT_SIZE[0]);
        const height = Math.max(MIN_SIZE[1], Number(this.size?.[1]) || DEFAULT_SIZE[1]);
        const fontSize = number(this.properties.font_size, 32, 8, 180);
        const fontWeight = text(this.properties.font_weight, "700");
        const fontFamily = text(this.properties.font_family, "Inter, Arial, sans-serif");
        const lineHeight = number(this.properties.line_height, 1.2, 0.8, 3) * fontSize;
        const padding = number(this.properties.padding, 6, 0, 80);
        const radius = number(this.properties.border_radius, 10, 0, 80);
        const alignment = ["left", "center", "right"].includes(this.properties.text_align)
          ? this.properties.text_align
          : "left";

        context.save();
        if (!isTransparent(this.properties.background_color)) {
          setFillStyle(context, this.properties.background_color, "rgba(5,8,6,0.82)");
          roundedRect(context, 0, 0, width, height, radius);
          context.fill();
        }

        context.beginPath();
        context.rect(0, 0, width, height);
        context.clip();
        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        context.textAlign = alignment;
        context.textBaseline = "top";
        setFillStyle(context, this.properties.font_color, BRAND_WHITE);
        const x = alignment === "left" ? padding : alignment === "right" ? width - padding : width / 2;
        const lines = layoutLines(context, this, width);
        lines.forEach((line, index) => {
          const y = padding + index * lineHeight;
          if (y < height) context.fillText(line, x, y);
        });
        context.restore();

        if (isSelected(this)) {
          context.save();
          context.strokeStyle = BRAND_GREEN;
          context.lineWidth = 2;
          context.setLineDash([7, 5]);
          roundedRect(context, -2, -2, width + 4, height + 4, radius + 2);
          context.stroke();
          context.restore();
        }
      }
    }

    Object.assign(DossCanvasLabel, {
      title: DISPLAY_NAME,
      collapsable: false,
      title_mode: LiteGraphApi.NO_TITLE,
    });
    LiteGraphApi.registerNodeType(NODE_TYPE, DossCanvasLabel);
    // LiteGraph derives and overwrites category during registration, so assign it afterward.
    DossCanvasLabel.category = CATEGORY;
  },
});
