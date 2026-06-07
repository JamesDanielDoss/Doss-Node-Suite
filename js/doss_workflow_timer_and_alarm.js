import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "DossWorkflowTimerAndAlarm";
const SETTINGS_WIDGETS = [
  "timer_label",
  "show_timer_label",
  "show_status",
  "show_milliseconds",
  "hide_node_ui",
  "font_size",
  "font_color",
  "background_color",
  "background_opacity",
  "border_color",
  "border_radius",
  "alarm_enabled",
  "alarm_sound",
  "alarm_volume",
];

const STATUS = {
  READY: "Ready",
  RUNNING: "Running",
  COMPLETE: "Complete",
  ERROR: "Error",
  CANCELED: "Canceled",
};

const NORMAL_NODE_SIZE = [520, 330];
const DISPLAY_ONLY_NODE_SIZE = [500, 190];
const TITLE_COVER_OFFSET = 32;
const DOUBLE_CLICK_MS = 450;
const DOUBLE_CLICK_DISTANCE = 12;
const CARD_DRAG_DISTANCE = 6;

const TRANSPARENT_COLOR = "transparent";
const COLOR_SWATCHES = [
  { label: "Transparent", value: TRANSPARENT_COLOR },
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
];

const timerNodes = new Set();
const timerState = {
  status: STATUS.READY,
  promptId: null,
  startTime: null,
  endTime: null,
  running: false,
  completionHandled: false,
  animationFrame: null,
};

function findWidgetObject(node, name) {
  return node.widgets?.find((widget) => widget.name === name);
}

function getWidgetValue(node, name, fallback = undefined) {
  const widget = findWidgetObject(node, name);
  return widget?.value ?? fallback;
}

function setWidgetValue(node, name, value) {
  const widget = findWidgetObject(node, name);
  if (!widget) {
    return;
  }
  widget.value = value;
  widget.callback?.(value);
}

function hideWidget(widget) {
  if (!widget || widget.name === "Customize") {
    return;
  }
  widget.hidden = true;
  widget.dossOriginalComputeSize ??= widget.computeSize;
  widget.computeSize = () => [0, -4];
  widget.draw = () => {};
}

function hideSettingsWidgets(node) {
  for (const name of SETTINGS_WIDGETS) {
    hideWidget(findWidgetObject(node, name));
  }
}

function setCustomizeButtonVisibility(node) {
  const widget = findWidgetObject(node, "Customize");
  if (!widget) {
    return;
  }
  const hidden = boolValue(getWidgetValue(node, "hide_node_ui", false));
  widget.hidden = hidden;
  widget.dossOriginalComputeSize ??= widget.computeSize;
  widget.dossOriginalDraw ??= widget.draw;
  if (hidden) {
    widget.computeSize = () => [0, -4];
    widget.draw = () => {};
  } else {
    widget.computeSize = widget.dossOriginalComputeSize;
    widget.draw = widget.dossOriginalDraw;
  }
}

function transparentNodeColor() {
  return "rgba(0,0,0,0)";
}

function nodeTitleHeight() {
  return window.LiteGraph?.NODE_TITLE_HEIGHT || TITLE_COVER_OFFSET;
}

function displayOnlyCardBounds(node) {
  const titleHeight = nodeTitleHeight();
  const nodeWidth = Math.max(node.size?.[0] || DISPLAY_ONLY_NODE_SIZE[0], DISPLAY_ONLY_NODE_SIZE[0]);
  const nodeHeight = Math.max((node.size?.[1] || DISPLAY_ONLY_NODE_SIZE[1]) + titleHeight, DISPLAY_ONLY_NODE_SIZE[1]);
  return {
    x: 0,
    y: -titleHeight,
    width: nodeWidth,
    height: nodeHeight,
  };
}

function isTimerNode(node) {
  return node?.comfyClass === NODE_TYPE || node?.type === NODE_TYPE;
}

function isDisplayOnlyTimerNode(node) {
  return isTimerNode(node) && boolValue(getWidgetValue(node, "hide_node_ui", false));
}

function installDisplayOnlyShellPatch() {
  if (window.__dossWorkflowTimerShellPatchInstalled || typeof LGraphCanvas === "undefined") {
    return;
  }
  if (!LGraphCanvas?.prototype?.drawNodeShape) {
    return;
  }
  window.__dossWorkflowTimerShellPatchInstalled = true;
  const originalDrawNodeShape = LGraphCanvas.prototype.drawNodeShape;
  LGraphCanvas.prototype.drawNodeShape = function (node, ctx) {
    if (isDisplayOnlyTimerNode(node)) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      return;
    }
    return originalDrawNodeShape.apply(this, arguments);
  };
}

function pointInDisplayOnlyCard(node, x, y) {
  const settings = nodeSettings(node);
  if (!settings.hide_node_ui) {
    return false;
  }
  const bounds = displayOnlyCardBounds(node);
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function graphPointFromEvent(event, pos, node) {
  if (Number.isFinite(event?.canvasX) && Number.isFinite(event?.canvasY)) {
    return [event.canvasX, event.canvasY];
  }
  const converted = app.canvas?.convertEventToCanvasOffset?.(event);
  if (Array.isArray(converted) && Number.isFinite(converted[0]) && Number.isFinite(converted[1])) {
    return converted;
  }
  if (app.canvas?.graph_mouse) {
    return [app.canvas.graph_mouse[0], app.canvas.graph_mouse[1]];
  }
  if (pos && node?.pos) {
    return [node.pos[0] + pos[0], node.pos[1] + pos[1]];
  }
  return null;
}

function removeTimerCardDragListeners(node) {
  const listeners = node.dossTimerCardDragListeners;
  if (!listeners) {
    return;
  }
  document.removeEventListener("pointermove", listeners.move, true);
  document.removeEventListener("mousemove", listeners.move, true);
  document.removeEventListener("pointerup", listeners.up, true);
  document.removeEventListener("mouseup", listeners.up, true);
  node.dossTimerCardDragListeners = null;
}

function finishTimerCardDrag(node, event) {
  const drag = node.dossTimerCardDrag;
  if (drag) {
    if (drag.moved) {
      node.dossLastTimerCardPointer = null;
    } else {
      node.dossLastTimerCardPointer = {
        time: performance.now(),
        x: drag.startLocal[0],
        y: drag.startLocal[1],
        dragged: false,
      };
    }
  }
  node.dossTimerCardDrag = null;
  removeTimerCardDragListeners(node);
  event?.stopPropagation?.();
}

function moveTimerCardDrag(node, event) {
  const drag = node.dossTimerCardDrag;
  if (!drag) {
    return false;
  }
  const graphPoint = graphPointFromEvent(event, null, node);
  if (!graphPoint) {
    return false;
  }
  const dx = graphPoint[0] - drag.startGraph[0];
  const dy = graphPoint[1] - drag.startGraph[1];
  if (Math.hypot(dx, dy) >= CARD_DRAG_DISTANCE) {
    drag.moved = true;
  }
  node.pos[0] = drag.startNodePos[0] + dx;
  node.pos[1] = drag.startNodePos[1] + dy;
  node.setDirtyCanvas?.(true, true);
  node.graph?.setDirtyCanvas?.(true, true);
  event?.preventDefault?.();
  event?.stopPropagation?.();
  return true;
}

function startTimerCardDrag(node, event, pos) {
  const graphPoint = graphPointFromEvent(event, pos, node);
  if (!graphPoint || !node?.pos) {
    return false;
  }
  removeTimerCardDragListeners(node);
  node.dossTimerCardDrag = {
    startGraph: graphPoint,
    startLocal: [pos[0], pos[1]],
    startNodePos: [node.pos[0], node.pos[1]],
    moved: false,
  };
  app.canvas?.selectNode?.(node);
  const listeners = {
    move: (moveEvent) => moveTimerCardDrag(node, moveEvent),
    up: (upEvent) => finishTimerCardDrag(node, upEvent),
  };
  node.dossTimerCardDragListeners = listeners;
  document.addEventListener("pointermove", listeners.move, true);
  document.addEventListener("mousemove", listeners.move, true);
  document.addEventListener("pointerup", listeners.up, true);
  document.addEventListener("mouseup", listeners.up, true);
  event?.preventDefault?.();
  event?.stopPropagation?.();
  return true;
}

function handleTimerCardPointer(node, event, pos) {
  if (!pos || (event.type !== "pointerdown" && event.type !== "mousedown" && event.type !== "dblclick")) {
    return false;
  }
  if (!pointInDisplayOnlyCard(node, pos[0], pos[1])) {
    return false;
  }
  const now = performance.now();
  const last = node.dossLastTimerCardPointer;
  const isDoubleClick =
    event.type === "dblclick" ||
    event.detail >= 2 ||
    (last &&
      !last.dragged &&
      now - last.time <= DOUBLE_CLICK_MS &&
      Math.abs(pos[0] - last.x) <= DOUBLE_CLICK_DISTANCE &&
      Math.abs(pos[1] - last.y) <= DOUBLE_CLICK_DISTANCE);

  if (isDoubleClick) {
    node.dossLastTimerCardPointer = null;
    node.dossTimerCardDrag = null;
    removeTimerCardDragListeners(node);
    openCustomizeModal(node);
    return true;
  }
  return startTimerCardDrag(node, event, pos);
}

function applyDisplayOnlyMode(node, displayName = "Doss Workflow Timer and Alarm") {
  hideSettingsWidgets(node);
  setCustomizeButtonVisibility(node);
  const displayOnly = boolValue(getWidgetValue(node, "hide_node_ui", false));
  node.dossOriginalVisualState ??= {
    title: node.title,
    color: node.color,
    bgcolor: node.bgcolor,
    boxcolor: node.boxcolor,
    getTitle: node.getTitle,
  };

  if (displayOnly) {
    node.title = "";
    node.getTitle = () => "";
    node.color = transparentNodeColor();
    node.bgcolor = transparentNodeColor();
    node.boxcolor = transparentNodeColor();
    if (!node.dossWasDisplayOnly) {
      node.setSize?.([Math.max(node.size?.[0] || DISPLAY_ONLY_NODE_SIZE[0], DISPLAY_ONLY_NODE_SIZE[0]), DISPLAY_ONLY_NODE_SIZE[1]]);
    }
  } else {
    const original = node.dossOriginalVisualState;
    node.title = original?.title || displayName;
    if (original?.getTitle) {
      node.getTitle = original.getTitle;
    }
    node.color = original?.color;
    node.bgcolor = original?.bgcolor;
    node.boxcolor = original?.boxcolor;
    if (node.dossWasDisplayOnly) {
      node.setSize?.([Math.max(node.size?.[0] || NORMAL_NODE_SIZE[0], NORMAL_NODE_SIZE[0]), NORMAL_NODE_SIZE[1]]);
    }
  }

  node.dossWasDisplayOnly = displayOnly;
  node.setDirtyCanvas?.(true, true);
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

function normalizeColor(value, fallback) {
  const text = String(value || "").trim();
  if (
    text.toLowerCase() === TRANSPARENT_COLOR ||
    /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(text)
  ) {
    return TRANSPARENT_COLOR;
  }
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(text) ? text : fallback;
}

function isTransparentColor(value) {
  return normalizeColor(value, "#000000") === TRANSPARENT_COLOR;
}

function boolValue(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function hexToRgb(hex) {
  const normalized = normalizeColor(hex, "#111111").slice(1);
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbaFromHex(hex, alpha) {
  if (isTransparentColor(hex)) {
    return TRANSPARENT_COLOR;
  }
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function elapsedMilliseconds() {
  if (!timerState.startTime) {
    return 0;
  }
  const end = timerState.running ? performance.now() : timerState.endTime || performance.now();
  return Math.max(0, end - timerState.startTime);
}

function formatElapsed(milliseconds, showMilliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const base = [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  if (!showMilliseconds) {
    return base;
  }
  return `${base}.${String(Math.floor(milliseconds % 1000)).padStart(3, "0")}`;
}

function markDirty() {
  for (const node of timerNodes) {
    node.setDirtyCanvas?.(true, false);
  }
}

function animationLoop() {
  markDirty();
  if (timerState.running) {
    timerState.animationFrame = requestAnimationFrame(animationLoop);
  } else {
    timerState.animationFrame = null;
  }
}

function startAnimationLoop() {
  if (!timerState.animationFrame) {
    timerState.animationFrame = requestAnimationFrame(animationLoop);
  }
}

function startTimer(promptId) {
  timerState.status = STATUS.RUNNING;
  timerState.promptId = promptId || null;
  timerState.startTime = performance.now();
  timerState.endTime = null;
  timerState.running = true;
  timerState.completionHandled = false;
  startAnimationLoop();
  markDirty();
}

function shouldHandlePrompt(promptId) {
  return !timerState.promptId || !promptId || timerState.promptId === promptId;
}

function finishTimer(status, promptId, shouldPlayAlarm) {
  if (!timerState.running && timerState.completionHandled) {
    return;
  }
  if (!shouldHandlePrompt(promptId)) {
    return;
  }
  timerState.status = status;
  timerState.endTime = performance.now();
  timerState.running = false;
  timerState.completionHandled = true;
  markDirty();
  if (shouldPlayAlarm) {
    playCompletionAlarm();
  }
}

function firstAlarmSettings() {
  for (const node of timerNodes) {
    const enabled = boolValue(getWidgetValue(node, "alarm_enabled", true));
    const volume = clampNumber(getWidgetValue(node, "alarm_volume", 70), 70, 0, 100);
    if (enabled && volume > 0) {
      return {
        sound: getWidgetValue(node, "alarm_sound", "Ping") === "Beep" ? "Beep" : "Ping",
        volume: volume / 100,
      };
    }
  }
  return null;
}

function playTone(audioContext, frequency, start, duration, volume, type = "sine") {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playCompletionAlarm() {
  const settings = firstAlarmSettings();
  if (!settings) {
    return;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const audioContext = new AudioContextClass();
    audioContext.resume?.().catch?.(() => {});
    const now = audioContext.currentTime + 0.03;
    if (settings.sound === "Beep") {
      playTone(audioContext, 880, now, 0.18, settings.volume, "square");
    } else {
      playTone(audioContext, 784, now, 0.12, settings.volume, "sine");
      playTone(audioContext, 1046.5, now + 0.14, 0.16, settings.volume * 0.85, "sine");
    }
    setTimeout(() => audioContext.close?.().catch?.(() => {}), 800);
  } catch (error) {
    console.warn("[Doss Workflow Timer and Alarm] Alarm playback was blocked or unavailable.", error);
  }
}

function statusColor(status) {
  if (status === STATUS.RUNNING) {
    return "#60a5fa";
  }
  if (status === STATUS.COMPLETE) {
    return "#22c55e";
  }
  if (status === STATUS.ERROR || status === STATUS.CANCELED) {
    return "#f97316";
  }
  return "rgba(255, 255, 255, 0.72)";
}

function nodeSettings(node) {
  return {
    timer_label: String(getWidgetValue(node, "timer_label", "Workflow Timer") || "Workflow Timer"),
    show_timer_label: boolValue(getWidgetValue(node, "show_timer_label", true)),
    show_status: boolValue(getWidgetValue(node, "show_status", true)),
    show_milliseconds: boolValue(getWidgetValue(node, "show_milliseconds", false)),
    hide_node_ui: boolValue(getWidgetValue(node, "hide_node_ui", false)),
    font_size: clampNumber(getWidgetValue(node, "font_size", 28), 28, 12, 96),
    font_color: normalizeColor(getWidgetValue(node, "font_color", "#ffffff"), "#ffffff"),
    background_color: normalizeColor(getWidgetValue(node, "background_color", "#111111"), "#111111"),
    background_opacity: clampNumber(getWidgetValue(node, "background_opacity", 0.85), 0.85, 0, 1),
    border_color: normalizeColor(getWidgetValue(node, "border_color", "#3b82f6"), "#3b82f6"),
    border_radius: clampNumber(getWidgetValue(node, "border_radius", 8), 8, 0, 32),
    alarm_enabled: boolValue(getWidgetValue(node, "alarm_enabled", true)),
    alarm_sound: getWidgetValue(node, "alarm_sound", "Ping") === "Beep" ? "Beep" : "Ping",
    alarm_volume: clampNumber(getWidgetValue(node, "alarm_volume", 70), 70, 0, 100),
  };
}

function drawTimerCard(ctx, settings, x, y, width, height, status, elapsedText) {
  roundedRect(ctx, x, y, width, height, settings.border_radius);
  if (!isTransparentColor(settings.background_color)) {
    ctx.fillStyle = rgbaFromHex(settings.background_color, settings.background_opacity);
    ctx.fill();
  }
  if (!isTransparentColor(settings.border_color)) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = settings.border_color;
    ctx.stroke();
  }

  if (settings.show_timer_label) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.font = "600 15px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(settings.timer_label.slice(0, 64), x + 20, y + 18);
  }

  ctx.fillStyle = settings.font_color;
  ctx.font = `800 ${settings.font_size}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(elapsedText, x + width / 2, y + height / 2 + 6);

  if (settings.show_status) {
    ctx.fillStyle = statusColor(status);
    ctx.font = "700 15px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(status, x + width - 20, y + height - 18);
  }

  if (settings.alarm_enabled && settings.alarm_volume > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = "600 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`Alarm ${settings.alarm_sound}`, x + 20, y + height - 18);
  }
}

class DossWorkflowTimerWidget {
  constructor(node) {
    this.name = "doss_workflow_timer_and_alarm";
    this.type = "custom";
    this.node = node;
  }

  draw(ctx, node, width, y) {
    const settings = nodeSettings(node);
    const displayOnly = settings.hide_node_ui;
    const bounds = displayOnly
      ? displayOnlyCardBounds(node)
      : { x: 0, y: y + 4, width, height: this.computeSize(width)[1] - 8 };
    const elapsed = formatElapsed(elapsedMilliseconds(), settings.show_milliseconds);
    ctx.save();
    drawTimerCard(ctx, settings, bounds.x, bounds.y, bounds.width, bounds.height, timerState.status, elapsed);
    ctx.restore();
  }

  computeSize(width) {
    const settings = nodeSettings(this.node);
    return [
      Math.max(width || 460, settings.hide_node_ui ? DISPLAY_ONLY_NODE_SIZE[0] : 420),
      settings.hide_node_ui ? DISPLAY_ONLY_NODE_SIZE[1] : 230,
    ];
  }

  mouse(event, pos, node) {
    return handleTimerCardPointer(node, event, pos);
  }

  serializeValue() {
    return {
      status: timerState.status,
      elapsed_ms: Math.round(elapsedMilliseconds()),
    };
  }
}

function makeButton(label) {
  const button = document.createElement("button");
  button.textContent = label;
  button.style.border = "1px solid var(--border-color, #555)";
  button.style.background = "var(--comfy-input-bg, #222)";
  button.style.color = "var(--fg-color, #ddd)";
  button.style.borderRadius = "4px";
  button.style.padding = "7px 11px";
  button.style.cursor = "pointer";
  return button;
}

function makeModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "10000";
  overlay.style.background = "rgba(0, 0, 0, 0.58)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const panel = document.createElement("div");
  panel.style.width = "min(720px, calc(100vw - 32px))";
  panel.style.maxHeight = "min(820px, calc(100vh - 32px))";
  panel.style.background = "var(--comfy-menu-bg, #1f1f1f)";
  panel.style.color = "var(--fg-color, #ddd)";
  panel.style.border = "1px solid var(--border-color, #555)";
  panel.style.borderRadius = "8px";
  panel.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.45)";
  panel.style.padding = "16px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "12px";
  overlay.appendChild(panel);
  return { overlay, panel };
}

function makeField(label, input) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "grid";
  wrapper.style.gap = "5px";
  wrapper.style.fontSize = "12px";
  wrapper.style.color = "rgba(255,255,255,0.78)";
  const text = document.createElement("span");
  text.textContent = label;
  wrapper.appendChild(text);
  wrapper.appendChild(input);
  return wrapper;
}

function styleInput(input) {
  input.style.background = "var(--comfy-input-bg, #222)";
  input.style.color = "var(--fg-color, #ddd)";
  input.style.border = "1px solid var(--border-color, #555)";
  input.style.borderRadius = "4px";
  input.style.padding = "6px";
  return input;
}

function makeTextInput(value) {
  const input = styleInput(document.createElement("input"));
  input.type = "text";
  input.value = value;
  return input;
}

function makeCheckbox(value) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(value);
  return input;
}

function makeCheckboxRow(label, input) {
  const wrapper = document.createElement("label");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";
  wrapper.style.fontSize = "12px";
  wrapper.style.color = "rgba(255,255,255,0.82)";
  wrapper.style.minHeight = "30px";
  input.style.margin = "0";
  wrapper.appendChild(input);
  const text = document.createElement("span");
  text.textContent = label;
  wrapper.appendChild(text);
  return wrapper;
}

function makeSwatchButton(swatch, selectedValue) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = swatch.label;
  button.dataset.value = swatch.value;
  button.style.width = "28px";
  button.style.height = "28px";
  button.style.borderRadius = "5px";
  button.style.border = "1px solid rgba(255,255,255,0.32)";
  button.style.cursor = "pointer";
  button.style.padding = "0";
  button.style.boxSizing = "border-box";
  if (swatch.value === TRANSPARENT_COLOR) {
    button.style.background =
      "linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)";
    button.style.backgroundColor = "#202020";
    button.style.backgroundSize = "10px 10px";
    button.style.backgroundPosition = "0 0, 0 5px, 5px -5px, -5px 0";
  } else {
    button.style.background = swatch.value;
  }
  if (normalizeColor(selectedValue, "#ffffff") === swatch.value) {
    button.style.outline = "2px solid #ffffff";
    button.style.outlineOffset = "2px";
  }
  return button;
}

function makeColorSwatches(value, fallback) {
  let selected = normalizeColor(value, fallback);
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.gap = "7px";
  row.style.padding = "4px 0";

  function refresh() {
    row.replaceChildren();
    for (const swatch of COLOR_SWATCHES) {
      const button = makeSwatchButton(swatch, selected);
      button.onclick = () => {
        selected = swatch.value;
        refresh();
        row.dispatchEvent(new Event("input", { bubbles: true }));
      };
      row.appendChild(button);
    }
  }

  refresh();
  return {
    row,
    value: () => selected,
  };
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
  const number = styleInput(document.createElement("input"));
  number.type = "number";
  number.min = String(min);
  number.max = String(max);
  number.step = String(step);
  number.value = String(value);
  range.oninput = () => {
    number.value = range.value;
  };
  number.oninput = () => {
    range.value = number.value;
  };
  row.appendChild(range);
  row.appendChild(number);
  return { row, range, number, value: () => number.value };
}

function makeSelect(value, options) {
  const select = styleInput(document.createElement("select"));
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    select.appendChild(element);
  }
  select.value = options.includes(value) ? value : options[0];
  return select;
}

function openCustomizeModal(node) {
  const current = nodeSettings(node);
  const { overlay, panel } = makeModal();

  const title = document.createElement("div");
  title.textContent = "Customize Doss Workflow Timer and Alarm";
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  panel.appendChild(title);

  const preview = document.createElement("canvas");
  preview.width = 640;
  preview.height = 190;
  preview.style.width = "100%";
  preview.style.border = "1px solid var(--border-color, #444)";
  preview.style.borderRadius = "6px";
  preview.style.background = "#0b0b0d";
  panel.appendChild(preview);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  grid.style.gap = "10px";
  panel.appendChild(grid);

  const controls = {
    timer_label: makeTextInput(current.timer_label),
    show_timer_label: makeCheckbox(current.show_timer_label),
    show_status: makeCheckbox(current.show_status),
    show_milliseconds: makeCheckbox(current.show_milliseconds),
    hide_node_ui: makeCheckbox(current.hide_node_ui),
    font_size: makeRangeNumber(current.font_size, 12, 96, 1),
    font_color: makeColorSwatches(current.font_color, "#ffffff"),
    background_color: makeColorSwatches(current.background_color, "#111111"),
    background_opacity: makeRangeNumber(current.background_opacity, 0, 1, 0.01),
    border_color: makeColorSwatches(current.border_color, "#3b82f6"),
    border_radius: makeRangeNumber(current.border_radius, 0, 32, 1),
    alarm_enabled: makeCheckbox(current.alarm_enabled),
    alarm_sound: makeSelect(current.alarm_sound, ["Ping", "Beep"]),
    alarm_volume: makeRangeNumber(current.alarm_volume, 0, 100, 1),
  };

  grid.appendChild(makeField("Timer label", controls.timer_label));
  grid.appendChild(makeField("Font size", controls.font_size.row));
  grid.appendChild(makeField("Font color", controls.font_color.row));
  grid.appendChild(makeField("Background color", controls.background_color.row));
  grid.appendChild(makeField("Background opacity", controls.background_opacity.row));
  grid.appendChild(makeField("Border color", controls.border_color.row));
  grid.appendChild(makeField("Border radius", controls.border_radius.row));
  grid.appendChild(makeField("Alarm sound", controls.alarm_sound));
  grid.appendChild(makeField("Alarm volume", controls.alarm_volume.row));
  grid.appendChild(makeCheckboxRow("Show title/label", controls.show_timer_label));
  grid.appendChild(makeCheckboxRow("Show status", controls.show_status));
  grid.appendChild(makeCheckboxRow("Show milliseconds", controls.show_milliseconds));
  grid.appendChild(makeCheckboxRow("Alarm enabled", controls.alarm_enabled));
  grid.appendChild(makeCheckboxRow("Display-only mode", controls.hide_node_ui));

  function collectSettings() {
    return {
      timer_label: controls.timer_label.value,
      show_timer_label: controls.show_timer_label.checked,
      show_status: controls.show_status.checked,
      show_milliseconds: controls.show_milliseconds.checked,
      hide_node_ui: controls.hide_node_ui.checked,
      font_size: clampNumber(controls.font_size.value(), 28, 12, 96),
      font_color: normalizeColor(controls.font_color.value(), "#ffffff"),
      background_color: normalizeColor(controls.background_color.value(), "#111111"),
      background_opacity: clampNumber(controls.background_opacity.value(), 0.85, 0, 1),
      border_color: normalizeColor(controls.border_color.value(), "#3b82f6"),
      border_radius: clampNumber(controls.border_radius.value(), 8, 0, 32),
      alarm_enabled: controls.alarm_enabled.checked,
      alarm_sound: controls.alarm_sound.value === "Beep" ? "Beep" : "Ping",
      alarm_volume: clampNumber(controls.alarm_volume.value(), 70, 0, 100),
    };
  }

  function drawPreview() {
    const ctx = preview.getContext("2d");
    ctx.clearRect(0, 0, preview.width, preview.height);
    const settings = collectSettings();
    drawTimerCard(ctx, settings, 18, 18, preview.width - 36, preview.height - 36, timerState.status, formatElapsed(elapsedMilliseconds(), settings.show_milliseconds));
  }

  for (const control of Object.values(controls)) {
    if (control instanceof HTMLElement) {
      control.oninput = drawPreview;
      control.onchange = drawPreview;
    } else if (control.row && !control.range) {
      control.row.addEventListener("input", drawPreview);
    } else {
      control.range.oninput = () => {
        control.number.value = control.range.value;
        drawPreview();
      };
      control.number.oninput = () => {
        control.range.value = control.number.value;
        drawPreview();
      };
    }
  }
  drawPreview();

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "8px";
  const cancelButton = makeButton("Cancel");
  const saveButton = makeButton("Save");
  actions.appendChild(cancelButton);
  actions.appendChild(saveButton);
  panel.appendChild(actions);

  cancelButton.onclick = () => overlay.remove();
  saveButton.onclick = () => {
    const settings = collectSettings();
    for (const [key, value] of Object.entries(settings)) {
      setWidgetValue(node, key, value);
    }
    applyDisplayOnlyMode(node);
    overlay.remove();
  };

  document.body.appendChild(overlay);
}

function setupTimerEvents() {
  if (window.__dossWorkflowTimerEventsInstalled) {
    return;
  }
  window.__dossWorkflowTimerEventsInstalled = true;

  api.addEventListener("execution_start", ({ detail }) => {
    startTimer(detail?.prompt_id);
  });
  api.addEventListener("execution_success", ({ detail }) => {
    finishTimer(STATUS.COMPLETE, detail?.prompt_id, true);
  });
  api.addEventListener("execution_error", ({ detail }) => {
    finishTimer(STATUS.ERROR, detail?.prompt_id, false);
  });
  api.addEventListener("execution_interrupted", ({ detail }) => {
    finishTimer(STATUS.CANCELED, detail?.prompt_id, false);
  });
  api.addEventListener("executing", ({ detail }) => {
    // Current-node reset events are not reliable completion signals for this display node.
    // Does not treat `executing` with a null node as workflow completion.
    // Completion is handled by execution_success, execution_error, and execution_interrupted.
    if (timerState.running && detail?.prompt_id && timerState.promptId && detail.prompt_id !== timerState.promptId) {
      return;
    }
    markDirty();
  });
  api.addEventListener("status", () => {
    markDirty();
  });
}

app.registerExtension({
  name: "doss.workflowTimerAndAlarm",
  async setup() {
    installDisplayOnlyShellPatch();
    setupTimerEvents();
  },
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) {
      return;
    }
    installDisplayOnlyShellPatch();

    const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
    const originalOnConfigure = nodeType.prototype.onConfigure;
    const originalOnDblClick = nodeType.prototype.onDblClick;
    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    const originalOnMouseMove = nodeType.prototype.onMouseMove;
    const originalOnMouseUp = nodeType.prototype.onMouseUp;
    const originalOnDrawBackground = nodeType.prototype.onDrawBackground;
    const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
    const originalOnRemoved = nodeType.prototype.onRemoved;

    nodeType.prototype.onNodeCreated = function () {
      originalOnNodeCreated?.apply(this, arguments);
      try {
        hideSettingsWidgets(this);
        this.addWidget("button", "Customize", "Customize", () => openCustomizeModal(this));
        this.dossWorkflowTimerWidget = this.addCustomWidget(new DossWorkflowTimerWidget(this));
        const width = Math.max(this.size?.[0] || 520, 520);
        const height = Math.max(this.size?.[1] || 330, 330);
        this.setSize?.([width, height]);
        applyDisplayOnlyMode(this, nodeData.display_name || NODE_TYPE);
        timerNodes.add(this);
      } catch (error) {
        console.warn("[Doss Workflow Timer and Alarm] Frontend widget setup failed.", error);
      }
    };

    nodeType.prototype.onConfigure = function () {
      originalOnConfigure?.apply(this, arguments);
      applyDisplayOnlyMode(this, nodeData.display_name || NODE_TYPE);
    };

    nodeType.prototype.onDblClick = function () {
      originalOnDblClick?.apply(this, arguments);
      openCustomizeModal(this);
      return true;
    };

    nodeType.prototype.onMouseDown = function (event, pos) {
      if (handleTimerCardPointer(this, event, pos)) {
        return true;
      }
      return originalOnMouseDown?.apply(this, arguments);
    };

    nodeType.prototype.onMouseMove = function (event, pos) {
      if (moveTimerCardDrag(this, event)) {
        return true;
      }
      return originalOnMouseMove?.apply(this, arguments);
    };

    nodeType.prototype.onMouseUp = function (event, pos) {
      if (this.dossTimerCardDrag) {
        finishTimerCardDrag(this, event);
        return true;
      }
      return originalOnMouseUp?.apply(this, arguments);
    };

    nodeType.prototype.onDrawBackground = function () {
      if (boolValue(getWidgetValue(this, "hide_node_ui", false))) {
        return;
      }
      return originalOnDrawBackground?.apply(this, arguments);
    };

    nodeType.prototype.onDrawForeground = function () {
      if (boolValue(getWidgetValue(this, "hide_node_ui", false))) {
        return;
      }
      return originalOnDrawForeground?.apply(this, arguments);
    };

    nodeType.prototype.onRemoved = function () {
      removeTimerCardDragListeners(this);
      timerNodes.delete(this);
      originalOnRemoved?.apply(this, arguments);
    };
  },
});
