import { app } from "../../scripts/app.js";

const NODE_TYPE = "Doss Label Maker";
const LEGACY_NODE_TYPE = "DossCanvasLabel";
const DISPLAY_NAME = "Doss Label Maker";
const CATEGORY = "⚡ Doss Node Suite";
const TRANSPARENT = "transparent";
const DEFAULT_SIZE = Object.freeze([360, 86]);
const MIN_SIZE = Object.freeze([80, 32]);
const MAX_FONT_SIZE = 512;
const SELECTION_COLOR = "#69f58a";
const BRAND_WHITE = "#ffffff";
const COLOR_SWATCHES = Object.freeze([
  { label: "White", value: "#ffffff" },
  { label: "Light gray", value: "#d1d5db" },
  { label: "Gray", value: "#6b7280" },
  { label: "Black", value: "#000000" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
]);
const FONT_FAMILIES = Object.freeze([
  "system-ui, sans-serif",
  '"Segoe UI", Arial, sans-serif',
  "Arial, sans-serif",
  '"Arial Black", Arial, sans-serif',
  '"Arial Narrow", Arial, sans-serif',
  '"Arial Rounded MT Bold", Arial, sans-serif',
  '"Agency FB", Arial, sans-serif',
  "Bahnschrift, Arial, sans-serif",
  "Calibri, Arial, sans-serif",
  "Candara, Arial, sans-serif",
  '"Century Gothic", Arial, sans-serif',
  "Corbel, Arial, sans-serif",
  '"Franklin Gothic Medium", Arial, sans-serif',
  '"Gill Sans MT", Arial, sans-serif',
  "Helvetica, Arial, sans-serif",
  '"Lucida Sans Unicode", Arial, sans-serif',
  "Tahoma, Arial, sans-serif",
  "Verdana, sans-serif",
  '"Trebuchet MS", Arial, sans-serif',
  '"Berlin Sans FB", Arial, sans-serif',
  '"Britannic Bold", Arial, sans-serif',
  '"Eras Demi ITC", Arial, sans-serif',
  "Impact, sans-serif",
  '"Baskerville Old Face", Georgia, serif',
  '"Bell MT", Georgia, serif',
  '"Bodoni MT", Georgia, serif',
  '"Book Antiqua", Georgia, serif',
  '"Bookman Old Style", Georgia, serif',
  '"Californian FB", Georgia, serif',
  '"Calisto MT", Georgia, serif',
  "Cambria, Georgia, serif",
  "Centaur, Georgia, serif",
  "Century, Georgia, serif",
  '"Century Schoolbook", Georgia, serif',
  "Constantia, Georgia, serif",
  '"Copperplate Gothic Light", Georgia, serif',
  "Georgia, serif",
  "Garamond, serif",
  '"Palatino Linotype", Georgia, serif',
  "Rockwell, Georgia, serif",
  '"Times New Roman", serif',
  "Algerian, fantasy",
  '"Bauhaus 93", fantasy',
  '"Bernard MT Condensed", fantasy',
  "Broadway, fantasy",
  "Castellar, fantasy",
  '"Colonna MT", fantasy',
  '"Cooper Black", fantasy',
  "Elephant, fantasy",
  '"Engravers MT", fantasy',
  '"Felix Titling", fantasy',
  "Forte, cursive",
  "Gigi, cursive",
  "Jokerman, fantasy",
  '"Old English Text MT", fantasy',
  "Onyx, fantasy",
  "Papyrus, fantasy",
  "Ravie, fantasy",
  '"Showcard Gothic", fantasy',
  '"Snap ITC", fantasy',
  '"Stencil", fantasy',
  '"Wide Latin", fantasy',
  '"Blackadder ITC", cursive',
  '"Bradley Hand ITC", cursive',
  '"Brush Script MT", cursive',
  '"Edwardian Script ITC", cursive',
  '"Freestyle Script", cursive',
  '"French Script MT", cursive',
  "Gabriola, cursive",
  '"Lucida Calligraphy", cursive',
  '"Monotype Corsiva", cursive',
  '"Palace Script MT", cursive',
  "Pristina, cursive",
  '"Rage Italic", cursive',
  '"Segoe Print", cursive',
  '"Segoe Script", cursive',
  "Vivaldi, cursive",
  '"Cascadia Code", Consolas, monospace',
  '"Cascadia Mono", Consolas, monospace',
  "Consolas, monospace",
  '"Courier New", monospace',
  '"Lucida Console", monospace',
]);
const FONT_WEIGHTS = Object.freeze(["100", "200", "300", "400", "500", "600", "700", "800", "900"]);
const FONT_STRETCH_SCALES = Object.freeze({
  "ultra-condensed": 0.5,
  "extra-condensed": 0.625,
  condensed: 0.75,
  "semi-condensed": 0.875,
  normal: 1,
  "semi-expanded": 1.125,
  expanded: 1.25,
  "extra-expanded": 1.5,
  "ultra-expanded": 2,
});

function number(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function text(value, fallback = "") {
  const parsed = String(value ?? "").trim();
  return parsed || fallback;
}

function setFillStyle(context, value, fallback) {
  try {
    context.fillStyle = value;
  } catch (_) {
    context.fillStyle = fallback;
  }
}

function decodedLines(value) {
  return String(value || "Doss Label")
    .replaceAll("\\n", "\n")
    .split(/\r?\n/);
}

function bool(value, fallback = false) {
  return value == null ? fallback : Boolean(value);
}

function outlineIsEnabled(properties) {
  if (properties.outline_enabled != null) return bool(properties.outline_enabled);
  return number(properties.stroke_width, 0, 0, 40) > 0;
}

function shadowIsEnabled(properties) {
  if (properties.shadow_enabled != null) return bool(properties.shadow_enabled);
  return number(properties.shadow_blur, 0, 0, 100) > 0
    || number(properties.shadow_offset_x, 0, -200, 200) !== 0
    || number(properties.shadow_offset_y, 0, -200, 200) !== 0;
}

function shadowBlurIsEnabled(properties) {
  if (properties.shadow_blur_enabled != null) return bool(properties.shadow_blur_enabled);
  return number(properties.shadow_blur, 0, 0, 100) > 0;
}

function transformedText(value, transform) {
  const source = String(value || "Doss Label");
  if (transform === "uppercase") return source.toUpperCase();
  if (transform === "lowercase") return source.toLowerCase();
  if (transform === "title case") {
    return source.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  }
  return source;
}

function fontString(properties) {
  const style = ["normal", "italic", "oblique"].includes(properties.font_style)
    ? properties.font_style
    : "normal";
  const variant = properties.small_caps ? "small-caps" : "normal";
  const weight = text(properties.font_weight, "700");
  const size = number(properties.font_size, 32, 8, MAX_FONT_SIZE);
  const family = text(properties.font_family, FONT_FAMILIES[0]);
  return `${style} ${variant} ${weight} ${size}px ${family}`;
}

function fontStretchScale(properties) {
  return FONT_STRETCH_SCALES[text(properties.font_stretch, "normal")] || 1;
}

function configureTextContext(context, properties) {
  context.font = fontString(properties);
  if ("letterSpacing" in context) {
    context.letterSpacing = `${number(properties.letter_spacing, 0, -20, 100)}px`;
  }
  if ("wordSpacing" in context) {
    context.wordSpacing = `${number(properties.word_spacing, 0, -20, 200)}px`;
  }
  if ("fontKerning" in context) {
    context.fontKerning = text(properties.font_kerning, "normal");
  }
}

function measureLine(context, value, properties) {
  const source = String(value || "");
  const base = context.measureText(source).width;
  const letterSpacing = number(properties.letter_spacing, 0, -20, 100);
  const wordSpacing = number(properties.word_spacing, 0, -20, 200);
  const spaces = (source.match(/\s/g) || []).length;
  const nativeLetterSpacing = "letterSpacing" in context;
  const nativeWordSpacing = "wordSpacing" in context;
  const measured = base
    + (nativeLetterSpacing ? 0 : Math.max(0, Array.from(source).length - 1) * letterSpacing)
    + (nativeWordSpacing ? 0 : spaces * wordSpacing);
  return Math.max(0, measured * fontStretchScale(properties));
}

function wrapLine(context, value, maxWidth, properties) {
  if (measureLine(context, value, properties) <= maxWidth) return [value];
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let current = words.shift();
  for (const word of words) {
    const candidate = `${current} ${word}`;
    if (measureLine(context, candidate, properties) <= maxWidth) {
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
  const value = transformedText(node.title, node.properties.text_transform);
  return decodedLines(value).flatMap((line) => (wrap ? wrapLine(context, line, available, node.properties) : [line]));
}

function textMetrics(context, node, width) {
  configureTextContext(context, node.properties);
  const padding = number(node.properties.padding, 6, 0, 100);
  const fontSize = number(node.properties.font_size, 32, 8, MAX_FONT_SIZE);
  const lineHeight = number(node.properties.line_height, 1.2, 0.5, 4) * fontSize;
  const lines = layoutLines(context, node, width);
  const indent = number(node.properties.text_indent, 0, 0, 400);
  const widest = Math.max(
    MIN_SIZE[0],
    ...lines.map((line, index) => measureLine(context, line, node.properties) + (index === 0 ? indent : 0)),
  );
  return {
    lines,
    lineHeight,
    contentWidth: widest,
    width: Math.ceil(widest + padding * 2 + 4),
    height: Math.ceil(Math.max(fontSize, lines.length * lineHeight) + padding * 2 + 4),
  };
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
    if (node?.type === NODE_TYPE || node?.type === LEGACY_NODE_TYPE) return;
    return originalDrawNodeShape.apply(this, arguments);
  };
}

function styleInput(input) {
  input.style.background = "var(--comfy-input-bg, #222)";
  input.style.color = "var(--fg-color, #ddd)";
  input.style.border = "1px solid var(--border-color, #555)";
  input.style.borderRadius = "4px";
  input.style.padding = "7px";
  input.style.boxSizing = "border-box";
  input.style.width = "100%";
  return input;
}

function makeButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.border = "1px solid var(--border-color, #555)";
  button.style.background = "var(--comfy-input-bg, #222)";
  button.style.color = "var(--fg-color, #ddd)";
  button.style.borderRadius = "4px";
  button.style.padding = "7px 11px";
  button.style.cursor = "pointer";
  return button;
}

function makeField(label, input) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "grid";
  wrapper.style.gap = "5px";
  wrapper.style.fontSize = "12px";
  wrapper.style.color = "rgba(255,255,255,0.82)";
  const heading = document.createElement("span");
  heading.textContent = label;
  wrapper.append(heading, input);
  return wrapper;
}

function makeHint(message) {
  const hint = document.createElement("div");
  hint.textContent = message;
  hint.style.fontSize = "11px";
  hint.style.lineHeight = "1.35";
  hint.style.color = "rgba(255,255,255,0.58)";
  return hint;
}

function setControlEnabled(element, enabled) {
  element.style.opacity = enabled ? "1" : "0.42";
  element.style.pointerEvents = enabled ? "auto" : "none";
  if (enabled) {
    element.removeAttribute("aria-disabled");
  } else {
    element.setAttribute("aria-disabled", "true");
  }
  for (const control of element.querySelectorAll("button, input, select, textarea")) {
    control.disabled = !enabled;
  }
}

function makeSelect(value, values) {
  const select = styleInput(document.createElement("select"));
  for (const option of values) {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    select.appendChild(element);
  }
  select.value = values.includes(value) ? value : values[0];
  return select;
}

function makeFontFamilyControl(value, values) {
  const select = styleInput(document.createElement("select"));
  const customValue = "__custom__";
  for (const family of values) {
    const option = document.createElement("option");
    option.value = family;
    option.textContent = family.split(",")[0].replaceAll('"', "");
    option.style.fontFamily = family;
    select.appendChild(option);
  }
  const customOption = document.createElement("option");
  customOption.value = customValue;
  customOption.textContent = "Custom font family…";
  select.appendChild(customOption);
  const input = styleInput(document.createElement("input"));
  input.type = "text";
  input.placeholder = 'Example: "My Installed Font", sans-serif';
  input.value = value;
  select.value = values.includes(value) ? value : customValue;
  const wrapper = document.createElement("div");
  wrapper.style.display = "grid";
  wrapper.style.gap = "6px";
  const hint = makeHint("Choose an installed font, or select Custom to enter another installed family.");
  wrapper.append(select, input, hint);
  const refreshCustomVisibility = () => {
    input.style.display = select.value === customValue ? "block" : "none";
  };
  select.onchange = () => {
    if (select.value !== customValue) input.value = select.value;
    refreshCustomVisibility();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  input.oninput = () => {
    select.value = values.includes(input.value) ? input.value : customValue;
    refreshCustomVisibility();
  };
  refreshCustomVisibility();
  return { wrapper, input, select, value: () => input.value };
}

function makeRangeNumber(value, min, max, step = 1) {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "1fr 72px";
  row.style.gap = "8px";
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(value);
  const numeric = styleInput(document.createElement("input"));
  numeric.type = "number";
  numeric.min = String(min);
  numeric.max = String(max);
  numeric.step = String(step);
  numeric.value = String(value);
  range.oninput = () => { numeric.value = range.value; };
  numeric.oninput = () => { range.value = numeric.value; };
  row.append(range, numeric);
  return { row, range, numeric, value: () => numeric.value };
}

function makeCheckboxRow(label, checked) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";
  wrapper.style.fontSize = "12px";
  wrapper.style.color = "rgba(255,255,255,0.82)";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  const caption = document.createElement("span");
  caption.textContent = label;
  wrapper.append(input, caption);
  return { wrapper, input };
}

function makeSection(title, open = false) {
  const details = document.createElement("details");
  details.open = open;
  details.style.border = "1px solid var(--border-color, #444)";
  details.style.borderRadius = "6px";
  details.style.padding = "9px";
  const summary = document.createElement("summary");
  summary.textContent = title;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "700";
  summary.style.userSelect = "none";
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  grid.style.gap = "10px";
  grid.style.marginTop = "10px";
  details.append(summary, grid);
  return { details, grid };
}

function makeColorSwatches(value) {
  let selected = text(value, BRAND_WHITE).toLowerCase();
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.gap = "7px";
  row.style.padding = "4px 0";

  function refresh() {
    row.replaceChildren();
    for (const swatch of COLOR_SWATCHES) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = swatch.label;
      button.dataset.value = swatch.value;
      button.style.width = "28px";
      button.style.height = "28px";
      button.style.borderRadius = "5px";
      button.style.border = "1px solid rgba(255,255,255,0.32)";
      button.style.background = swatch.value;
      button.style.cursor = "pointer";
      button.style.padding = "0";
      if (selected === swatch.value) {
        button.style.outline = "2px solid #ffffff";
        button.style.outlineOffset = "2px";
      }
      const selectSwatch = () => {
        selected = swatch.value;
        refresh();
        row.dispatchEvent(new Event("input", { bubbles: true }));
      };
      button.onpointerdown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectSwatch();
      };
      button.onclick = (event) => {
        event.stopPropagation();
        if (selected !== swatch.value) selectSwatch();
      };
      row.appendChild(button);
    }
    const custom = document.createElement("input");
    custom.type = "color";
    custom.title = "Custom color";
    custom.value = /^#[0-9a-f]{6}$/i.test(selected) ? selected : BRAND_WHITE;
    custom.style.width = "36px";
    custom.style.height = "28px";
    custom.style.border = "0";
    custom.style.padding = "0";
    custom.style.background = "transparent";
    custom.oninput = () => {
      selected = custom.value.toLowerCase();
      row.dispatchEvent(new Event("input", { bubbles: true }));
    };
    row.appendChild(custom);
  }

  refresh();
  return { row, value: () => selected };
}

function drawTextLine(context, line, x, y, properties, width) {
  const opacity = number(properties.text_opacity, 1, 0, 1);
  const stretch = fontStretchScale(properties);
  const shadowEnabled = shadowIsEnabled(properties);
  context.save();
  context.translate(x, y);
  context.scale(stretch, 1);
  context.globalAlpha = opacity;
  context.shadowColor = shadowEnabled ? text(properties.shadow_color, "#3b82f6") : "transparent";
  context.shadowBlur = shadowEnabled && shadowBlurIsEnabled(properties)
    ? number(properties.shadow_blur, 0, 0, 100) / stretch
    : 0;
  context.shadowOffsetX = shadowEnabled
    ? number(properties.shadow_offset_x, 0, -200, 200) / stretch
    : 0;
  context.shadowOffsetY = shadowEnabled
    ? number(properties.shadow_offset_y, 0, -200, 200)
    : 0;
  const strokeWidth = number(properties.stroke_width, 0, 0, 40);
  if (outlineIsEnabled(properties) && strokeWidth > 0) {
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.lineWidth = strokeWidth * 2 / stretch;
    context.strokeStyle = text(properties.stroke_color, "#000000");
    context.strokeText(line, 0, 0);
  }
  setFillStyle(context, properties.font_color, BRAND_WHITE);
  context.fillText(line, 0, 0);
  context.restore();

  const fontSize = number(properties.font_size, 32, 8, MAX_FONT_SIZE);
  context.strokeStyle = text(properties.font_color, BRAND_WHITE);
  context.lineWidth = Math.max(1, fontSize / 18);
  if (properties.underline) {
    const underlineY = y + fontSize * 1.04;
    context.beginPath();
    context.moveTo(properties.text_align === "center" ? x - width / 2 : properties.text_align === "right" ? x - width : x, underlineY);
    context.lineTo(properties.text_align === "center" ? x + width / 2 : properties.text_align === "right" ? x : x + width, underlineY);
    context.stroke();
  }
  if (properties.strikethrough) {
    const strikeY = y + fontSize * 0.54;
    context.beginPath();
    context.moveTo(properties.text_align === "center" ? x - width / 2 : properties.text_align === "right" ? x - width : x, strikeY);
    context.lineTo(properties.text_align === "center" ? x + width / 2 : properties.text_align === "right" ? x : x + width, strikeY);
    context.stroke();
  }
}

function drawLabelText(context, node, width, height) {
  const properties = node.properties;
  configureTextContext(context, properties);
  const metrics = textMetrics(context, node, width);
  const padding = number(properties.padding, 6, 0, 100);
  const alignment = ["left", "center", "right"].includes(properties.text_align)
    ? properties.text_align
    : "left";
  const vertical = ["top", "middle", "bottom"].includes(properties.vertical_align)
    ? properties.vertical_align
    : "top";
  const contentHeight = metrics.lines.length * metrics.lineHeight;
  const availableHeight = Math.max(0, height - padding * 2);
  const top = vertical === "middle"
    ? padding + Math.max(0, (availableHeight - contentHeight) / 2)
    : vertical === "bottom"
      ? padding + Math.max(0, availableHeight - contentHeight)
      : padding;
  context.textAlign = alignment;
  context.textBaseline = "top";
  context.direction = properties.text_direction === "rtl" ? "rtl" : "ltr";
  const baseX = alignment === "left" ? padding : alignment === "right" ? width - padding : width / 2;
  const indent = number(properties.text_indent, 0, 0, 400);
  metrics.lines.forEach((line, index) => {
    const widthOfLine = measureLine(context, line, properties);
    const direction = alignment === "right" ? -1 : 1;
    const x = baseX + (index === 0 ? indent * direction : 0);
    drawTextLine(context, line, x, top + index * metrics.lineHeight, properties, widthOfLine);
  });
  return metrics;
}

function drawLabelPreview(canvas, settings, nodeSize) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const logicalWidth = Math.max(MIN_SIZE[0], Number(nodeSize?.[0]) || DEFAULT_SIZE[0]);
  const temporaryNode = { title: settings.label_text, properties: { ...settings } };
  const metrics = textMetrics(context, temporaryNode, logicalWidth);
  const logicalHeight = Math.max(MIN_SIZE[1], Number(nodeSize?.[1]) || DEFAULT_SIZE[1], metrics.height);
  const scale = Math.min(1, (canvas.width - 28) / logicalWidth, (canvas.height - 28) / logicalHeight);
  const offsetX = (canvas.width - logicalWidth * scale) / 2;
  const offsetY = (canvas.height - logicalHeight * scale) / 2;
  context.save();
  context.translate(offsetX, offsetY);
  context.scale(scale, scale);
  drawLabelText(context, temporaryNode, logicalWidth, logicalHeight);
  context.restore();
}

function openCustomizeModal(node) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "10000";
  overlay.style.background = "rgba(0,0,0,0.58)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const panel = document.createElement("div");
  panel.style.width = "min(920px, calc(100vw - 32px))";
  panel.style.maxHeight = "calc(100vh - 32px)";
  panel.style.overflow = "auto";
  panel.style.background = "var(--comfy-menu-bg, #1f1f1f)";
  panel.style.color = "var(--fg-color, #ddd)";
  panel.style.border = "1px solid var(--border-color, #555)";
  panel.style.borderRadius = "8px";
  panel.style.boxShadow = "0 16px 48px rgba(0,0,0,0.45)";
  panel.style.padding = "16px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "12px";
  overlay.appendChild(panel);

  const heading = document.createElement("div");
  heading.textContent = "Customize Doss Label Maker";
  heading.style.fontWeight = "700";
  heading.style.fontSize = "16px";
  panel.appendChild(heading);

  const preview = document.createElement("canvas");
  preview.width = 640;
  preview.height = 220;
  preview.style.width = "100%";
  preview.style.background = "#0b0b0d";
  preview.style.borderRadius = "6px";
  panel.appendChild(preview);

  const labelText = styleInput(document.createElement("textarea"));
  labelText.rows = 4;
  labelText.value = String(node.title || "Doss Label").replaceAll("\\n", "\n");
  labelText.style.resize = "vertical";
  const fontSize = makeRangeNumber(number(node.properties.font_size, 32, 8, MAX_FONT_SIZE), 8, MAX_FONT_SIZE, 1);
  const fontFamily = makeFontFamilyControl(
    text(node.properties.font_family, FONT_FAMILIES[0]),
    FONT_FAMILIES,
  );
  const fontWeight = makeSelect(text(node.properties.font_weight, "700"), FONT_WEIGHTS);
  const fontStyle = makeSelect(text(node.properties.font_style, "normal"), ["normal", "italic"]);
  const fontStretch = makeSelect(text(node.properties.font_stretch, "normal"), [
    "ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal",
    "semi-expanded", "expanded", "extra-expanded", "ultra-expanded",
  ]);
  const fontColor = makeColorSwatches(node.properties.font_color);
  const textOpacity = makeRangeNumber(number(node.properties.text_opacity, 1, 0, 1), 0, 1, 0.01);
  const textAlign = makeSelect(text(node.properties.text_align, "left"), ["left", "center", "right"]);
  const verticalAlign = makeSelect(text(node.properties.vertical_align, "top"), ["top", "middle", "bottom"]);
  const textDirection = makeSelect(text(node.properties.text_direction, "ltr"), ["ltr", "rtl"]);
  const textTransform = makeSelect(text(node.properties.text_transform, "none"), ["none", "uppercase", "lowercase", "title case"]);
  const lineHeight = makeRangeNumber(number(node.properties.line_height, 1.2, 0.5, 4), 0.5, 4, 0.05);
  const letterSpacing = makeRangeNumber(number(node.properties.letter_spacing, 0, -20, 100), -20, 100, 0.5);
  const wordSpacing = makeRangeNumber(number(node.properties.word_spacing, 0, -20, 200), -20, 200, 1);
  const textIndent = makeRangeNumber(number(node.properties.text_indent, 0, 0, 400), 0, 400, 1);
  const padding = makeRangeNumber(number(node.properties.padding, 6, 0, 100), 0, 100, 1);
  const wrapText = makeCheckboxRow("Wrap text to the current label width", node.properties.wrap_text !== false);
  const underline = makeCheckboxRow("Underline", bool(node.properties.underline));
  const strikethrough = makeCheckboxRow("Strikethrough", bool(node.properties.strikethrough));
  const smallCaps = makeCheckboxRow("Small caps", bool(node.properties.small_caps));
  const fontKerning = makeSelect(text(node.properties.font_kerning, "normal"), ["normal", "none"]);
  const outlineEnabled = makeCheckboxRow(
    "Enable text outline",
    outlineIsEnabled(node.properties),
  );
  const strokeWidth = makeRangeNumber(number(node.properties.stroke_width, 0, 0, 40), 0, 40, 0.5);
  const strokeColor = makeColorSwatches(node.properties.stroke_color || "#000000");
  const shadowEnabled = makeCheckboxRow(
    "Enable shadow",
    shadowIsEnabled(node.properties),
  );
  const shadowBlurEnabled = makeCheckboxRow(
    "Blur shadow",
    shadowBlurIsEnabled(node.properties),
  );
  const shadowColor = makeColorSwatches(node.properties.shadow_color || "#3b82f6");
  const shadowBlur = makeRangeNumber(number(node.properties.shadow_blur, 0, 0, 100), 0, 100, 1);
  const shadowOffsetX = makeRangeNumber(number(node.properties.shadow_offset_x, 0, -200, 200), -200, 200, 1);
  const shadowOffsetY = makeRangeNumber(number(node.properties.shadow_offset_y, 0, -200, 200), -200, 200, 1);

  const textSection = makeSection("Text", true);
  const textField = makeField("Label text", labelText);
  textField.style.gridColumn = "1 / -1";
  textSection.grid.append(textField, makeField("Text transform", textTransform));

  const fontSection = makeSection("Font", true);
  fontSection.grid.append(
    makeField("Font family", fontFamily.wrapper),
    makeField("Font size", fontSize.row),
    makeField("Font weight", fontWeight),
    makeField("Font style", fontStyle),
    makeField("Font stretch", fontStretch),
    makeField("Font color", fontColor.row),
    makeField("Text opacity", textOpacity.row),
    underline.wrapper,
    strikethrough.wrapper,
    smallCaps.wrapper,
  );

  const layoutSection = makeSection("Paragraph and spacing", true);
  layoutSection.grid.append(
    makeField("Horizontal alignment", textAlign),
    makeField("Vertical alignment (when the label has extra height)", verticalAlign),
    makeField("Text direction (use RTL for Arabic or Hebrew)", textDirection),
    makeField("Line height (multiline text)", lineHeight.row),
    makeField("Letter spacing", letterSpacing.row),
    makeField("Word spacing (text containing spaces)", wordSpacing.row),
    makeField("First-line indent (multiline text)", textIndent.row),
    makeField("Text padding", padding.row),
    wrapText.wrapper,
  );

  const effectsSection = makeSection("Typography and effects");
  const strokeColorField = makeField("Text outline color", strokeColor.row);
  const shadowColorField = makeField("Shadow color", shadowColor.row);
  effectsSection.grid.append(
    makeField("Kerning (most visible in pairs such as AV or WA)", fontKerning),
    outlineEnabled.wrapper,
    makeField("Text outline width", strokeWidth.row),
    strokeColorField,
    shadowEnabled.wrapper,
    shadowColorField,
    shadowBlurEnabled.wrapper,
    makeField("Shadow blur", shadowBlur.row),
    makeField("Shadow X offset", shadowOffsetX.row),
    makeField("Shadow Y offset", shadowOffsetY.row),
  );
  panel.append(textSection.details, fontSection.details, layoutSection.details, effectsSection.details);

  function settings() {
    return {
      label_text: labelText.value || "Doss Label",
      font_size: number(fontSize.value(), 32, 8, MAX_FONT_SIZE),
      font_family: text(fontFamily.value(), FONT_FAMILIES[0]),
      font_weight: fontWeight.value,
      font_style: fontStyle.value,
      font_stretch: fontStretch.value,
      font_color: fontColor.value(),
      text_opacity: number(textOpacity.value(), 1, 0, 1),
      text_align: textAlign.value,
      vertical_align: verticalAlign.value,
      text_direction: textDirection.value,
      text_transform: textTransform.value,
      line_height: number(lineHeight.value(), 1.2, 0.5, 4),
      letter_spacing: number(letterSpacing.value(), 0, -20, 100),
      word_spacing: number(wordSpacing.value(), 0, -20, 200),
      text_indent: number(textIndent.value(), 0, 0, 400),
      padding: number(padding.value(), 6, 0, 100),
      wrap_text: wrapText.input.checked,
      underline: underline.input.checked,
      strikethrough: strikethrough.input.checked,
      small_caps: smallCaps.input.checked,
      font_kerning: fontKerning.value,
      outline_enabled: outlineEnabled.input.checked,
      stroke_width: number(strokeWidth.value(), 0, 0, 40),
      stroke_color: strokeColor.value(),
      shadow_enabled: shadowEnabled.input.checked,
      shadow_blur_enabled: shadowBlurEnabled.input.checked,
      shadow_color: shadowColor.value(),
      shadow_blur: number(shadowBlur.value(), 0, 0, 100),
      shadow_offset_x: number(shadowOffsetX.value(), 0, -200, 200),
      shadow_offset_y: number(shadowOffsetY.value(), 0, -200, 200),
    };
  }

  const refreshDependentControls = () => {
    const outlineActive = outlineEnabled.input.checked;
    const shadowActive = shadowEnabled.input.checked;
    setControlEnabled(strokeWidth.row, outlineActive);
    setControlEnabled(strokeColor.row, outlineActive);
    setControlEnabled(shadowColor.row, shadowActive);
    setControlEnabled(shadowOffsetX.row, shadowActive);
    setControlEnabled(shadowOffsetY.row, shadowActive);
    setControlEnabled(shadowBlurEnabled.wrapper, shadowActive);
    setControlEnabled(shadowBlur.row, shadowActive && shadowBlurEnabled.input.checked);
  };
  const refreshPreview = () => {
    refreshDependentControls();
    drawLabelPreview(preview, settings(), node.size);
  };
  for (const input of [
    labelText, fontFamily.input, fontWeight, fontStyle, fontStretch, textAlign, verticalAlign,
    textDirection, textTransform, fontKerning, wrapText.input,
    underline.input, strikethrough.input, smallCaps.input,
    outlineEnabled.input, shadowEnabled.input, shadowBlurEnabled.input,
  ]) {
    input.addEventListener("input", refreshPreview);
    input.addEventListener("change", refreshPreview);
  }
  for (const control of [
    fontSize, textOpacity, lineHeight, letterSpacing, wordSpacing, textIndent, padding,
    strokeWidth, shadowBlur, shadowOffsetX, shadowOffsetY,
  ]) {
    control.range.addEventListener("input", refreshPreview);
    control.numeric.addEventListener("input", refreshPreview);
  }
  for (const color of [fontColor, strokeColor, shadowColor]) {
    color.row.addEventListener("input", refreshPreview);
  }
  outlineEnabled.input.addEventListener("change", () => {
    if (outlineEnabled.input.checked && number(strokeWidth.value(), 0, 0, 40) === 0) {
      strokeWidth.range.value = "2";
      strokeWidth.numeric.value = "2";
    }
    refreshPreview();
  });
  shadowEnabled.input.addEventListener("change", () => {
    if (shadowEnabled.input.checked
      && number(shadowOffsetX.value(), 0, -200, 200) === 0
      && number(shadowOffsetY.value(), 0, -200, 200) === 0
      && !shadowBlurEnabled.input.checked) {
      shadowOffsetX.range.value = "8";
      shadowOffsetX.numeric.value = "8";
      shadowOffsetY.range.value = "8";
      shadowOffsetY.numeric.value = "8";
    }
    refreshPreview();
  });
  shadowBlurEnabled.input.addEventListener("change", () => {
    if (shadowBlurEnabled.input.checked) {
      shadowEnabled.input.checked = true;
      if (number(shadowBlur.value(), 0, 0, 100) === 0) {
        shadowBlur.range.value = "12";
        shadowBlur.numeric.value = "12";
      }
    }
    refreshPreview();
  });
  refreshPreview();

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "space-between";
  actions.style.gap = "8px";
  const fitButton = makeButton("Save and Fit to Text");
  const rightActions = document.createElement("div");
  rightActions.style.display = "flex";
  rightActions.style.gap = "8px";
  const cancelButton = makeButton("Cancel");
  const saveButton = makeButton("Save");
  rightActions.append(cancelButton, saveButton);
  actions.append(fitButton, rightActions);
  panel.appendChild(actions);

  function save(fit) {
    const next = settings();
    node.title = next.label_text.trim() || "Doss Label";
    for (const key of Object.keys(next).filter((key) => key !== "label_text")) {
      node.properties[key] = next[key];
    }
    node.properties.background_color = TRANSPARENT;
    if (fit) {
      fitLabelToText(node);
    } else {
      ensureTextVisible(node);
    }
    node.setDirtyCanvas?.(true, true);
    overlay.remove();
  }

  cancelButton.onclick = () => overlay.remove();
  saveButton.onclick = () => save(false);
  fitButton.onclick = () => save(true);
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
  overlay.onkeydown = (event) => {
    if (event.key === "Escape") overlay.remove();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") save(false);
  };
  document.body.appendChild(overlay);
  labelText.focus();
}

function fitLabelToText(node) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  const originalWrap = node.properties.wrap_text;
  node.properties.wrap_text = false;
  const metrics = textMetrics(context, node, Number.MAX_SAFE_INTEGER);
  node.properties.wrap_text = originalWrap;
  node.setSize?.([metrics.width, metrics.height]);
  node.setDirtyCanvas?.(true, true);
}

function ensureTextVisible(node, requestedSize = node.size) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return requestedSize;
  let width = Math.max(MIN_SIZE[0], Number(requestedSize?.[0]) || DEFAULT_SIZE[0]);
  const metrics = textMetrics(context, node, width);
  if (node.properties.wrap_text === false) width = Math.max(width, metrics.width);
  const finalMetrics = textMetrics(context, node, width);
  const height = Math.max(MIN_SIZE[1], Number(requestedSize?.[1]) || DEFAULT_SIZE[1], finalMetrics.height);
  if (requestedSize) {
    requestedSize[0] = width;
    requestedSize[1] = height;
  }
  return [width, height];
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
      constructor() {
        super("Doss Label");
        this.title = "Doss Label";
        this.isVirtualNode = true;
        this.serialize_widgets = false;
        this.resizable = true;
        this.color = "rgba(0,0,0,0)";
        this.bgcolor = "rgba(0,0,0,0)";
        this.boxcolor = "rgba(0,0,0,0)";
        this.addProperty("font_size", 32, "number", { min: 8, max: MAX_FONT_SIZE, step: 1 });
        this.addProperty("font_family", FONT_FAMILIES[1], "string");
        this.addProperty("font_weight", "700", "combo", {
          values: [...FONT_WEIGHTS],
        });
        this.addProperty("font_style", "normal", "combo", { values: ["normal", "italic"] });
        this.addProperty("font_stretch", "normal", "string");
        this.addProperty("font_color", BRAND_WHITE, "string");
        this.addProperty("text_opacity", 1, "number", { min: 0, max: 1, step: 0.01 });
        this.addProperty("text_align", "left", "combo", {
          values: ["left", "center", "right"],
        });
        this.addProperty("vertical_align", "top", "combo", { values: ["top", "middle", "bottom"] });
        this.addProperty("text_direction", "ltr", "combo", { values: ["ltr", "rtl"] });
        this.addProperty("text_transform", "none", "combo", { values: ["none", "uppercase", "lowercase", "title case"] });
        this.addProperty("line_height", 1.2, "number", { min: 0.5, max: 4, step: 0.05 });
        this.addProperty("letter_spacing", 0, "number", { min: -20, max: 100, step: 0.5 });
        this.addProperty("word_spacing", 0, "number", { min: -20, max: 200, step: 1 });
        this.addProperty("text_indent", 0, "number", { min: 0, max: 400, step: 1 });
        this.addProperty("wrap_text", true, "boolean");
        this.addProperty("underline", false, "boolean");
        this.addProperty("strikethrough", false, "boolean");
        this.addProperty("small_caps", false, "boolean");
        this.addProperty("font_kerning", "normal", "combo", { values: ["normal", "none"] });
        this.addProperty("outline_enabled", false, "boolean");
        this.addProperty("stroke_width", 0, "number", { min: 0, max: 40, step: 0.5 });
        this.addProperty("stroke_color", "#000000", "string");
        this.addProperty("shadow_enabled", false, "boolean");
        this.addProperty("shadow_blur_enabled", false, "boolean");
        this.addProperty("shadow_color", "#3b82f6", "string");
        this.addProperty("shadow_blur", 0, "number", { min: 0, max: 100, step: 1 });
        this.addProperty("shadow_offset_x", 8, "number", { min: -200, max: 200, step: 1 });
        this.addProperty("shadow_offset_y", 8, "number", { min: -200, max: 200, step: 1 });
        this.addProperty("background_color", TRANSPARENT, "string");
        this.addProperty("padding", 6, "number", { min: 0, max: 100, step: 1 });
        this.addProperty("border_radius", 10, "number", { min: 0, max: 80, step: 1 });
        this.setSize?.([...DEFAULT_SIZE]);
      }

      getTitle() {
        return "";
      }

      onResize(size) {
        size[0] = Math.max(MIN_SIZE[0], Number(size[0]) || DEFAULT_SIZE[0]);
        size[1] = Math.max(MIN_SIZE[1], Number(size[1]) || DEFAULT_SIZE[1]);
        ensureTextVisible(this, size);
        this.setDirtyCanvas?.(true, true);
      }

      onDblClick() {
        openCustomizeModal(this);
        return true;
      }

      onConfigure(info) {
        const saved = info?.properties || {};
        if (!Object.prototype.hasOwnProperty.call(saved, "outline_enabled")) {
          this.properties.outline_enabled = number(saved.stroke_width, 0, 0, 40) > 0;
        }
        if (!Object.prototype.hasOwnProperty.call(saved, "shadow_enabled")) {
          this.properties.shadow_enabled = number(saved.shadow_blur, 0, 0, 100) > 0
            || number(saved.shadow_offset_x, 0, -200, 200) !== 0
            || number(saved.shadow_offset_y, 0, -200, 200) !== 0;
        }
        if (!Object.prototype.hasOwnProperty.call(saved, "shadow_blur_enabled")) {
          this.properties.shadow_blur_enabled = number(saved.shadow_blur, 0, 0, 100) > 0;
        }
      }

      onPropertyChanged() {
        ensureTextVisible(this);
        this.setDirtyCanvas?.(true, true);
        return true;
      }

      getExtraMenuOptions(_, options) {
        options.unshift(
          {
            content: "Customize Doss Label Maker",
            callback: () => openCustomizeModal(this),
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

        context.save();
        context.beginPath();
        context.rect(0, 0, width, height);
        context.clip();
        drawLabelText(context, this, width, height);
        context.restore();

        if (isSelected(this)) {
          const handle = Math.max(10, Math.min(18, Math.min(width, height) * 0.18));
          context.save();
          context.strokeStyle = SELECTION_COLOR;
          context.lineWidth = 2;
          context.setLineDash([7, 5]);
          context.strokeRect(0, 0, width, height);
          context.setLineDash([]);
          context.fillStyle = SELECTION_COLOR;
          context.fillRect(width - handle, height - handle, handle, handle);
          context.strokeStyle = "#0b0b0d";
          context.lineWidth = 1;
          context.strokeRect(width - handle, height - handle, handle, handle);
          context.restore();
        }
      }
    }

    Object.assign(DossCanvasLabel, {
      title: DISPLAY_NAME,
      collapsable: false,
      title_mode: LiteGraphApi.NO_TITLE,
    });

    class LegacyDossCanvasLabel extends DossCanvasLabel {}
    Object.assign(LegacyDossCanvasLabel, {
      title: "Doss Canvas Label",
      category: CATEGORY,
      collapsable: false,
      title_mode: LiteGraphApi.NO_TITLE,
      skip_list: true,
    });
    LiteGraphApi.registerNodeType(LEGACY_NODE_TYPE, LegacyDossCanvasLabel);
    LegacyDossCanvasLabel.category = CATEGORY;
    LegacyDossCanvasLabel.skip_list = true;

    LiteGraphApi.registerNodeType(NODE_TYPE, DossCanvasLabel);
    // LiteGraph derives and overwrites category during registration, so assign it afterward.
    DossCanvasLabel.title = DISPLAY_NAME;
    DossCanvasLabel.category = CATEGORY;
  },
});
