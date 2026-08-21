import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const SETTINGS_NODE = "DossLTXMotionSettings";
const STUDIO_NODE = "DossLTXMotionStudio";
const BRAND = Object.freeze({
  green: "#69f58a",
  greenStrong: "#22c55e",
  greenDeep: "#123b21",
  ink: "#050806",
  glass: "rgba(7, 18, 11, 0.90)",
  glassSoft: "rgba(16, 38, 24, 0.76)",
  white: "#f7fff9",
  muted: "#a9b8ae",
  line: "rgba(105, 245, 138, 0.38)",
  lineSoft: "rgba(247, 255, 249, 0.16)",
  danger: "#ef4444",
});
const COLORS = [
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];
const PLAN_VERSION = 1;

function widget(node, name) {
  return node.widgets?.find((item) => item.name === name);
}

function hideWidget(item) {
  if (!item || item.dossHidden) return;
  item.dossHidden = true;
  item.dossOriginalComputeSize = item.computeSize;
  item.dossOriginalDraw = item.draw;
  item.computeSize = () => [0, -4];
  item.draw = () => {};
  item.hidden = true;
}

function setWidget(node, name, value) {
  const item = widget(node, name);
  if (!item) return;
  item.value = value;
  item.callback?.(value);
  node.setDirtyCanvas?.(true, true);
}

function el(tag, properties = {}, children = []) {
  const element = document.createElement(tag);
  Object.assign(element, properties);
  for (const child of children) {
    element.append(child);
  }
  return element;
}

function applyStyles(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function labeledControl(label, control, help = "") {
  const labelElement = applyStyles(el("label", { textContent: label }), {
    display: "grid",
    gap: "5px",
    color: BRAND.white,
    font: "600 12px system-ui, sans-serif",
  });
  labelElement.append(control);
  if (help) {
    labelElement.append(
      applyStyles(el("span", { textContent: help }), {
        color: BRAND.muted,
        fontSize: "11px",
        fontWeight: "400",
      }),
    );
  }
  return labelElement;
}

function textArea(value, rows = 3) {
  return applyStyles(el("textarea", { value: value ?? "", rows }), {
    width: "100%",
    resize: "vertical",
    boxSizing: "border-box",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "9px",
    background: "rgba(1, 7, 3, 0.72)",
    color: BRAND.white,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    padding: "8px",
    font: "13px system-ui, sans-serif",
    pointerEvents: "auto",
  });
}

function numberInput(value, min, max, step = 1) {
  return applyStyles(el("input", { type: "number", value, min, max, step }), {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "9px",
    background: "rgba(1, 7, 3, 0.72)",
    color: BRAND.white,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    padding: "7px",
    pointerEvents: "auto",
  });
}

function button(text, action, tone = "neutral") {
  const colors = {
    neutral: ["rgba(17, 49, 29, 0.88)", BRAND.white, BRAND.line],
    primary: [BRAND.green, BRAND.ink, BRAND.green],
    danger: ["rgba(127, 29, 29, 0.88)", "#fff1f2", "rgba(248,113,113,0.55)"],
  };
  const [background, color, borderColor] = colors[tone] || colors.neutral;
  const item = applyStyles(el("button", { type: "button", textContent: text }), {
    border: `1px solid ${borderColor}`,
    borderRadius: "8px",
    background,
    color,
    padding: "7px 10px",
    font: "600 12px system-ui, sans-serif",
    cursor: "pointer",
    pointerEvents: "auto",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  });
  item.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  });
  return item;
}

function installResponsiveWidget(node, root, {
  initialWidth,
  initialHeight,
  onResize,
}) {
  root.style.maxWidth = "100%";
  root.style.maxHeight = "100%";
  root.style.minWidth = "0";
  root.style.minHeight = "0";
  root.style.overflow = "auto";
  root.style.pointerEvents = "none";

  const originalOnResize = node.onResize;
  node.onResize = function () {
    originalOnResize?.apply(this, arguments);
    onResize?.();
    this.setDirtyCanvas?.(true, true);
  };

  node.setSize?.([
    Math.max(initialWidth, Number(node.size?.[0]) || 0),
    Math.max(initialHeight, Number(node.size?.[1]) || 0),
  ]);
}

function setupSettings(node) {
  if (node.dossMotionSettingsInitialized) return;
  node.dossMotionSettingsInitialized = true;
  const names = [
    "positive_prompt",
    "duration_seconds",
    "negative_prompt",
    "seed",
    "motion_strength",
    "image_adherence",
    "fps",
  ];
  for (const name of names) hideWidget(widget(node, name));

  const root = applyStyles(el("div"), {
    display: "grid",
    gap: "10px",
    padding: "12px",
    background: `linear-gradient(145deg, ${BRAND.glass}, ${BRAND.glassSoft})`,
    backdropFilter: "blur(18px) saturate(125%)",
    WebkitBackdropFilter: "blur(18px) saturate(125%)",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "14px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 16px 34px rgba(0,0,0,0.24)",
    boxSizing: "border-box",
    width: "100%",
  });

  root.append(
    applyStyles(el("div", { textContent: "MOTION SETTINGS" }), {
      color: BRAND.green,
      font: "800 12px system-ui, sans-serif",
      letterSpacing: "0.12em",
    }),
  );

  const positive = textArea(widget(node, "positive_prompt")?.value, 4);
  positive.dataset.testid = "doss-positive-prompt";
  positive.addEventListener("input", () => setWidget(node, "positive_prompt", positive.value));
  root.append(labeledControl("Positive prompt", positive, "Describe the subject, action, camera, and scene."));

  const duration = numberInput(widget(node, "duration_seconds")?.value ?? 5, 1, 20, 0.5);
  const frameSummary = applyStyles(el("div"), {
    color: BRAND.green,
    font: "12px system-ui, sans-serif",
  });
  const updateFrameSummary = () => {
    const fps = Number(widget(node, "fps")?.value || 24);
    const seconds = Number(duration.value || 5);
    const frames = 1 + Math.floor((seconds * fps) / 8) * 8;
    frameSummary.textContent = `${frames} frames • ${(frames / fps).toFixed(2)} seconds used`;
  };
  duration.addEventListener("input", () => {
    setWidget(node, "duration_seconds", Number(duration.value));
    updateFrameSummary();
  });
  root.append(labeledControl("Duration (seconds)", duration), frameSummary);

  const advanced = applyStyles(el("details"), {
    borderTop: `1px solid ${BRAND.lineSoft}`,
    paddingTop: "8px",
    pointerEvents: "auto",
  });
  const summary = el("summary", { textContent: "Advanced controls" });
  applyStyles(summary, {
    color: BRAND.white,
    font: "700 12px system-ui, sans-serif",
    cursor: "pointer",
  });
  const advancedBody = applyStyles(el("div"), {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    paddingTop: "10px",
  });
  const negative = textArea(widget(node, "negative_prompt")?.value, 2);
  negative.addEventListener("input", () => setWidget(node, "negative_prompt", negative.value));
  const negativeLabel = labeledControl("Negative prompt", negative, "Leave blank unless the tested shot needs one.");
  negativeLabel.style.gridColumn = "1 / -1";
  advancedBody.append(negativeLabel);

  const seed = numberInput(widget(node, "seed")?.value ?? 42, 0, Number.MAX_SAFE_INTEGER, 1);
  seed.addEventListener("input", () => setWidget(node, "seed", Number(seed.value)));
  advancedBody.append(labeledControl("Seed", seed));

  const fps = applyStyles(el("select"), {
    width: "100%",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "9px",
    background: BRAND.ink,
    color: BRAND.white,
    padding: "7px",
    pointerEvents: "auto",
  });
  for (const value of ["24", "30"]) {
    fps.append(el("option", { value, textContent: `${value} FPS` }));
  }
  fps.value = String(widget(node, "fps")?.value || "24");
  fps.addEventListener("change", () => {
    setWidget(node, "fps", fps.value);
    updateFrameSummary();
  });
  advancedBody.append(labeledControl("Frame rate", fps));

  const numericControls = new Map();
  for (const [name, label, help] of [
    ["motion_strength", "Motion strength", "Strength of the official motion-track IC-LoRA."],
    ["image_adherence", "Image adherence", "How strongly the opening image conditions the video."],
  ]) {
    const control = numberInput(widget(node, name)?.value ?? (name === "motion_strength" ? 1 : 0.7), 0, name === "motion_strength" ? 1.5 : 1, 0.05);
    control.addEventListener("input", () => setWidget(node, name, Number(control.value)));
    numericControls.set(name, control);
    advancedBody.append(labeledControl(label, control, help));
  }
  advanced.append(summary, advancedBody);
  root.append(advanced);
  updateFrameSummary();

  const domWidget = node.addDOMWidget("settings_panel", "DossLTXSettingsPanel", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => 300,
    afterResize: () => node.setDirtyCanvas?.(true, true),
  });
  installResponsiveWidget(node, root, {
    initialWidth: 500,
    initialHeight: 540,
  });
  const syncSettingsControls = () => {
    positive.value = String(widget(node, "positive_prompt")?.value ?? "");
    duration.value = String(widget(node, "duration_seconds")?.value ?? 5);
    negative.value = String(widget(node, "negative_prompt")?.value ?? "");
    seed.value = String(widget(node, "seed")?.value ?? 42);
    fps.value = String(widget(node, "fps")?.value ?? "24");
    numericControls.get("motion_strength").value = String(widget(node, "motion_strength")?.value ?? 1);
    numericControls.get("image_adherence").value = String(widget(node, "image_adherence")?.value ?? 0.7);
    updateFrameSummary();
  };
  const originalOnConfigure = node.onConfigure;
  node.onConfigure = function () {
    originalOnConfigure?.apply(this, arguments);
    syncSettingsControls();
    window.requestAnimationFrame(syncSettingsControls);
  };
  syncSettingsControls();
  window.requestAnimationFrame(syncSettingsControls);
  advanced.addEventListener("toggle", () => {
    if (!advanced.open) return;
    window.requestAnimationFrame(() => {
      node.setSize?.([node.size[0], Math.max(760, node.size[1])]);
      node.setDirtyCanvas?.(true, true);
    });
  });
}

function defaultPlan() {
  return {
    schemaVersion: PLAN_VERSION,
    source: { ref: "", width: 0, height: 0 },
    stale: false,
    tracks: [],
  };
}

function parsePlan(node) {
  try {
    const value = JSON.parse(widget(node, "motion_plan")?.value || "{}");
    if (value?.schemaVersion === PLAN_VERSION && Array.isArray(value.tracks)) return value;
  } catch (_) {
    // The editor will replace malformed state with a clean plan.
  }
  return defaultPlan();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function pointAt(track, progress) {
  const points = track?.points || [];
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  if (points.length === 2) {
    return {
      x: points[0].x + (points[1].x - points[0].x) * progress,
      y: points[0].y + (points[1].y - points[0].y) * progress,
    };
  }
  const padded = [points[0], ...points, points[points.length - 1]];
  const segments = padded.length - 3;
  const global = Math.min(segments, Math.max(0, progress * segments));
  const segment = Math.min(Math.floor(global), segments - 1);
  return catmull(padded[segment], padded[segment + 1], padded[segment + 2], padded[segment + 3], global - segment);
}

function upstreamImageReference(node) {
  const input = node.inputs?.find((item) => item.name === "image");
  const link = input?.link == null ? null : app.graph?.links?.[input.link];
  const origin = link ? app.graph?.getNodeById?.(link.origin_id) : null;
  const imageWidget = origin?.widgets?.find((item) => item.name === "image");
  const value = imageWidget?.value;
  return typeof value === "string" ? value : value?.filename || "";
}

function imageViewUrl(reference) {
  const normalized = String(reference || "").replaceAll("\\", "/");
  const slash = normalized.lastIndexOf("/");
  const filename = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const subfolder = slash >= 0 ? normalized.slice(0, slash) : "";
  return api.apiURL(`/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=input`);
}

function setupStudio(node) {
  if (node.dossMotionStudioInitialized) return;
  node.dossMotionStudioInitialized = true;
  hideWidget(widget(node, "motion_plan"));
  hideWidget(widget(node, "source_ref"));

  const initialPlan = parsePlan(node);
  const state = {
    plan: initialPlan,
    active: 0,
    image: null,
    imageRef: "",
    imageWidth: Number(initialPlan.source?.width) || 0,
    imageHeight: Number(initialPlan.source?.height) || 0,
    undo: [],
    redo: [],
    drag: null,
    playhead: 0,
  };
  node.dossMotionStudio = state;

  const root = applyStyles(el("div"), {
    display: "grid",
    gridTemplateRows: "auto auto auto minmax(240px, 1fr) auto auto auto",
    gridTemplateAreas: '"title" "banner" "toolbar" "canvas" "status" "help" "preview"',
    gap: "8px",
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    background: `linear-gradient(145deg, ${BRAND.glass}, ${BRAND.glassSoft})`,
    backdropFilter: "blur(18px) saturate(125%)",
    WebkitBackdropFilter: "blur(18px) saturate(125%)",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "14px",
    color: BRAND.white,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 16px 34px rgba(0,0,0,0.24)",
    font: "12px system-ui, sans-serif",
  });
  root.dataset.testid = "doss-ltx-motion-studio";
  const title = applyStyles(el("div", { textContent: "DOSS MOTION STUDIO | LTX 2.5" }), {
    gridArea: "title",
    color: BRAND.green,
    fontWeight: "800",
    letterSpacing: "0.12em",
  });
  const banner = applyStyles(el("div"), {
    gridArea: "banner",
    display: "none",
    gap: "8px",
    alignItems: "center",
    padding: "8px",
    borderRadius: "7px",
    background: "rgba(127, 29, 29, 0.86)",
    color: "#ffedd5",
  });
  banner.dataset.testid = "doss-motion-source-banner";
  const bannerText = el("span", { textContent: "Starting image changed. These paths are paused." });
  const keepButton = button("Keep & rescale", () => acceptSource(false), "primary");
  const clearForImageButton = button("Clear tracks", () => acceptSource(true), "danger");
  banner.append(bannerText, keepButton, clearForImageButton);

  const toolbar = applyStyles(el("div"), {
    gridArea: "toolbar",
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    alignItems: "center",
    pointerEvents: "auto",
  });
  const trackSelect = applyStyles(el("select"), {
    minWidth: "115px",
    background: BRAND.ink,
    color: BRAND.white,
    border: `1px solid ${BRAND.line}`,
    borderRadius: "8px",
    padding: "6px",
  });
  const trackName = applyStyles(el("input", { type: "text", placeholder: "Track name" }), {
    minWidth: "120px",
    flex: "1",
    background: BRAND.ink,
    color: BRAND.white,
    border: `1px solid ${BRAND.line}`,
    borderRadius: "8px",
    padding: "6px",
  });
  const trackColor = applyStyles(el("input", { type: "color", value: COLORS[0] }), {
    pointerEvents: "auto",
    border: `1px solid ${BRAND.line}`,
    borderRadius: "8px",
    background: BRAND.ink,
  });
  toolbar.append(
    trackSelect,
    trackName,
    trackColor,
    button("+ Moving track", () => addTrack(false)),
    button("+ Static point", () => addTrack(true)),
    button("Delete track", deleteTrack, "danger"),
    button("Clear", clearTracks, "danger"),
    button("Undo", undo),
    button("Redo", redo),
  );

  const canvas = applyStyles(el("canvas"), {
    display: "block",
    width: "100%",
    height: "auto",
    maxWidth: "100%",
    maxHeight: "100%",
    minWidth: "0",
    minHeight: "0",
    boxSizing: "border-box",
    background: BRAND.ink,
    border: `1px solid ${BRAND.lineSoft}`,
    borderRadius: "10px",
    cursor: "crosshair",
    touchAction: "none",
    pointerEvents: "auto",
  });
  const canvasFrame = applyStyles(el("div"), {
    gridArea: "canvas",
    display: "grid",
    placeItems: "center",
    minWidth: "0",
    minHeight: "240px",
    overflow: "hidden",
    borderRadius: "10px",
    background: "rgba(0, 5, 2, 0.62)",
    pointerEvents: "none",
  });
  canvasFrame.append(canvas);
  canvas.dataset.testid = "doss-motion-canvas";
  const status = applyStyles(el("div"), {
    gridArea: "status",
    color: BRAND.white,
    minHeight: "18px",
  });
  const help = applyStyles(
    el("div", {
      textContent: "Click to add • drag to move • right-click a point to remove • point 1 is the object anchor",
    }),
    { gridArea: "help", color: BRAND.muted, fontSize: "11px" },
  );
  const playhead = el("input", { type: "range", min: 0, max: 100, value: 0, step: 1 });
  playhead.style.width = "100%";
  playhead.style.pointerEvents = "auto";
  playhead.addEventListener("input", () => {
    state.playhead = Number(playhead.value) / 100;
    render();
  });
  const previewControl = labeledControl("Path preview", playhead, "Scrub from START to END without generating.");
  previewControl.style.gridArea = "preview";
  root.append(title, banner, toolbar, canvasFrame, status, help, previewControl);

  function snapshot() {
    state.undo.push(clone(state.plan));
    if (state.undo.length > 80) state.undo.shift();
    state.redo.length = 0;
  }

  function commit() {
    setWidget(node, "motion_plan", JSON.stringify(state.plan));
    setWidget(node, "source_ref", state.plan.source?.ref || "");
    refreshTrackControls();
    render();
  }

  function activeTrack() {
    return state.plan.tracks[state.active] || null;
  }

  function addTrack(isStatic) {
    if (state.plan.tracks.length >= COLORS.length) return;
    snapshot();
    const index = state.plan.tracks.length;
    state.plan.tracks.push({
      id: `track-${Date.now()}-${index + 1}`,
      name: isStatic ? `Static ${index + 1}` : `Track ${index + 1}`,
      color: COLORS[index % COLORS.length],
      points: isStatic ? [{ x: 0.5, y: 0.5 }] : [{ x: 0.35, y: 0.5 }, { x: 0.65, y: 0.5 }],
    });
    state.active = state.plan.tracks.length - 1;
    commit();
  }

  function deleteTrack() {
    if (!activeTrack()) return;
    snapshot();
    state.plan.tracks.splice(state.active, 1);
    state.active = Math.max(0, Math.min(state.active, state.plan.tracks.length - 1));
    commit();
  }

  function clearTracks() {
    if (!state.plan.tracks.length) return;
    snapshot();
    state.plan.tracks = [];
    state.active = 0;
    commit();
  }

  function undo() {
    const previous = state.undo.pop();
    if (!previous) return;
    state.redo.push(clone(state.plan));
    state.plan = previous;
    state.active = Math.max(0, Math.min(state.active, state.plan.tracks.length - 1));
    commit();
  }

  function redo() {
    const next = state.redo.pop();
    if (!next) return;
    state.undo.push(clone(state.plan));
    state.plan = next;
    state.active = Math.max(0, Math.min(state.active, state.plan.tracks.length - 1));
    commit();
  }

  function acceptSource(clear) {
    snapshot();
    state.plan.source = { ref: state.imageRef, width: state.imageWidth, height: state.imageHeight };
    state.plan.stale = false;
    if (clear) state.plan.tracks = [];
    if (!clear && state.plan.tracks.length === 0) addDefaultTrackWithoutSnapshot();
    banner.style.display = "none";
    commit();
  }

  function addDefaultTrackWithoutSnapshot() {
    state.plan.tracks = [{
      id: "track-1",
      name: "Track 1",
      color: COLORS[0],
      points: [{ x: 0.35, y: 0.5 }, { x: 0.65, y: 0.5 }],
    }];
    state.active = 0;
  }

  function refreshTrackControls() {
    trackSelect.innerHTML = "";
    state.plan.tracks.forEach((track, index) => {
      trackSelect.append(el("option", { value: String(index), textContent: track.name || `Track ${index + 1}` }));
    });
    trackSelect.value = String(state.active);
    const track = activeTrack();
    trackName.value = track?.name || "";
    trackName.disabled = !track;
    trackColor.value = track?.color || COLORS[0];
    trackColor.disabled = !track;
    const stale = state.plan.stale === true;
    banner.style.display = stale ? "flex" : "none";
    const sourceLabel = state.imageRef || "No starting image connected";
    status.textContent = track
      ? `${sourceLabel} • ${track.name} • ${track.points.length} point${track.points.length === 1 ? "" : "s"} • START → END`
      : `${sourceLabel} • Add a motion track before Run`;
  }

  trackSelect.addEventListener("change", () => {
    state.active = Number(trackSelect.value) || 0;
    refreshTrackControls();
    render();
  });
  trackName.addEventListener("change", () => {
    const track = activeTrack();
    if (!track) return;
    snapshot();
    track.name = trackName.value.trim() || `Track ${state.active + 1}`;
    commit();
  });
  trackColor.addEventListener("input", () => {
    const track = activeTrack();
    if (!track) return;
    snapshot();
    track.color = trackColor.value;
    commit();
  });

  function canvasGeometry() {
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
    const sourceWidth = state.imageWidth || Number(state.plan.source?.width) || 3;
    const sourceHeight = state.imageHeight || Number(state.plan.source?.height) || 2;
    const aspect = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : 1.5;
    const fallbackWidth = Math.max(1, (Number(node.size?.[0]) || 340) - 20);
    const availableWidth = Math.max(1, Math.floor(canvasFrame.clientWidth || root.clientWidth || fallbackWidth));
    const availableHeight = Math.max(
      1,
      Math.floor(canvasFrame.clientHeight || root.clientHeight || Math.max(240, availableWidth / aspect)),
    );
    let displayWidth = availableWidth;
    let displayHeight = displayWidth / aspect;
    if (displayHeight > availableHeight) {
      displayHeight = availableHeight;
      displayWidth = displayHeight * aspect;
    }
    displayWidth = Math.max(1, Math.floor(displayWidth));
    displayHeight = Math.max(1, Math.floor(displayHeight));
    const width = Math.max(1, Math.round(displayWidth * dpr));
    const height = Math.max(1, Math.round(displayHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    return { width, height, dpr, displayWidth, displayHeight };
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function hitPoint(point) {
    const geometry = canvasGeometry();
    const tolerance = 14 * geometry.dpr;
    let best = null;
    state.plan.tracks.forEach((track, trackIndex) => {
      track.points.forEach((candidate, pointIndex) => {
        const distance = Math.hypot((candidate.x - point.x) * geometry.width, (candidate.y - point.y) * geometry.height);
        if (distance <= tolerance && (!best || distance < best.distance)) best = { trackIndex, pointIndex, distance };
      });
    });
    return best;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.plan.stale) return;
    event.preventDefault();
    event.stopPropagation();
    const point = eventPoint(event);
    const hit = hitPoint(point);
    if (hit) {
      snapshot();
      state.active = hit.trackIndex;
      state.drag = { ...hit, pointerId: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    } else {
      if (!activeTrack()) addTrack(false);
      snapshot();
      activeTrack().points.push(point);
      commit();
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.drag) return;
    event.preventDefault();
    event.stopPropagation();
    const point = eventPoint(event);
    state.plan.tracks[state.drag.trackIndex].points[state.drag.pointIndex] = point;
    commit();
  });
  const endDrag = (event) => {
    if (!state.drag) return;
    try { canvas.releasePointerCapture(state.drag.pointerId); } catch (_) { /* already released */ }
    state.drag = null;
    canvas.style.cursor = "crosshair";
    event?.preventDefault?.();
    event?.stopPropagation?.();
    commit();
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state.plan.stale) return;
    const hit = hitPoint(eventPoint(event));
    if (!hit) return;
    const track = state.plan.tracks[hit.trackIndex];
    if (track.points.length <= 1) return;
    snapshot();
    track.points.splice(hit.pointIndex, 1);
    state.active = hit.trackIndex;
    commit();
  });

  function render() {
    const { width, height, dpr } = canvasGeometry();
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, width, height);
    if (state.image) {
      context.drawImage(state.image, 0, 0, width, height);
      context.fillStyle = "rgba(2, 6, 23, 0.12)";
      context.fillRect(0, 0, width, height);
    } else {
      context.fillStyle = "#020617";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#94a3b8";
      context.font = `${14 * dpr}px system-ui`;
      context.textAlign = "center";
      context.fillText("Connect and choose a Load Image file", width / 2, height / 2);
    }
    state.plan.tracks.forEach((track, trackIndex) => {
      const active = trackIndex === state.active;
      const samples = Array.from({ length: 80 }, (_, index) => pointAt(track, index / 79)).filter(Boolean);
      if (samples.length > 1) {
        context.beginPath();
        samples.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.strokeStyle = track.color;
        context.globalAlpha = active ? 1 : 0.55;
        context.lineWidth = (active ? 3 : 2) * dpr;
        context.stroke();
        context.globalAlpha = 1;
      }
      track.points.forEach((point, pointIndex) => {
        const x = point.x * width;
        const y = point.y * height;
        context.beginPath();
        context.arc(x, y, (active ? 7 : 5) * dpr, 0, Math.PI * 2);
        context.fillStyle = track.color;
        context.fill();
        context.lineWidth = 2 * dpr;
        context.strokeStyle = "#ffffff";
        context.stroke();
        if (active) {
          context.fillStyle = "#ffffff";
          context.font = `bold ${11 * dpr}px system-ui`;
          context.textAlign = "center";
          context.fillText(String(pointIndex + 1), x, y - 11 * dpr);
        }
      });
      const preview = pointAt(track, state.playhead);
      if (preview) {
        context.beginPath();
        context.arc(preview.x * width, preview.y * height, 11 * dpr, 0, Math.PI * 2);
        context.strokeStyle = "#facc15";
        context.lineWidth = 3 * dpr;
        context.stroke();
      }
      const start = track.points[0];
      const end = track.points[track.points.length - 1];
      for (const [label, point] of [["START", start], ["END", end]]) {
        if (!point) continue;
        context.fillStyle = "rgba(2,6,23,0.8)";
        context.fillRect(point.x * width - 24 * dpr, point.y * height + 10 * dpr, 48 * dpr, 16 * dpr);
        context.fillStyle = "#ffffff";
        context.font = `bold ${9 * dpr}px system-ui`;
        context.textAlign = "center";
        context.fillText(label, point.x * width, point.y * height + 21 * dpr);
      }
    });
  }

  function loadUpstreamImage() {
    const reference = upstreamImageReference(node);
    if (!reference || reference === state.imageRef) return;
    const image = new Image();
    image.onload = () => {
      state.image = image;
      state.imageRef = reference;
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      const source = state.plan.source || {};
      if (!source.ref) {
        state.plan.source = { ref: reference, width: image.naturalWidth, height: image.naturalHeight };
        state.plan.stale = false;
        if (state.plan.tracks.length === 0) addDefaultTrackWithoutSnapshot();
        commit();
      } else if (source.ref !== reference || source.width !== image.naturalWidth || source.height !== image.naturalHeight) {
        state.plan.stale = true;
        setWidget(node, "motion_plan", JSON.stringify(state.plan));
        banner.style.display = "flex";
        refreshTrackControls();
        render();
      } else {
        state.plan.stale = false;
        commit();
      }
    };
    image.onerror = () => {
      state.image = null;
      status.textContent = `Could not preview ${reference}; Run is blocked until the image is readable.`;
      render();
    };
    image.src = imageViewUrl(reference);
  }

  let pendingRender = 0;
  const scheduleRender = () => {
    if (pendingRender) return;
    pendingRender = window.requestAnimationFrame(() => {
      pendingRender = 0;
      render();
    });
  };
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(scheduleRender)
    : null;
  resizeObserver?.observe(canvasFrame);

  const domWidget = node.addDOMWidget("motion_studio", "DossLTXMotionStudio", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => 360,
    afterResize: () => {
      scheduleRender();
      node.setDirtyCanvas?.(true, true);
    },
  });
  installResponsiveWidget(node, root, {
    initialWidth: 720,
    initialHeight: 680,
    onResize: scheduleRender,
  });

  state.poll = window.setInterval(loadUpstreamImage, 500);
  node.dossMotionOriginalRemoved = node.onRemoved;
  node.onRemoved = function () {
    window.clearInterval(state.poll);
    if (pendingRender) {
      window.cancelAnimationFrame?.(pendingRender);
      pendingRender = 0;
    }
    resizeObserver?.disconnect();
    node.dossMotionOriginalRemoved?.apply(this, arguments);
  };
  node.dossMotionOriginalConfigure = node.onConfigure;
  node.onConfigure = function (info) {
    node.dossMotionOriginalConfigure?.apply(this, arguments);
    state.plan = parsePlan(node);
    state.active = 0;
    refreshTrackControls();
    loadUpstreamImage();
    scheduleRender();
  };

  refreshTrackControls();
  loadUpstreamImage();
  render();
  scheduleRender();
}

function installWelcomeEnhancement() {
  const enhance = () => {
    try {
      if (!app.graph?._nodes?.some((node) => node.comfyClass === STUDIO_NODE || node.type === STUDIO_NODE)) return;
      const welcome = document.querySelector('[data-testid="linear-welcome"]');
      if (!welcome || welcome.dataset.dossLtxWelcome === "1") return;
      welcome.dataset.dossLtxWelcome = "1";
      welcome.innerHTML = "";
      const card = applyStyles(el("div"), {
        maxWidth: "560px",
        margin: "0 auto",
        padding: "28px",
        border: `1px solid ${BRAND.line}`,
        borderRadius: "20px",
        background: `linear-gradient(145deg, ${BRAND.glass}, ${BRAND.glassSoft})`,
        backdropFilter: "blur(20px) saturate(130%)",
        WebkitBackdropFilter: "blur(20px) saturate(130%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 60px rgba(0,0,0,0.32)",
        textAlign: "left",
        color: BRAND.white,
      });
      card.append(
        applyStyles(el("div", { textContent: "DOSS MOTION NODE | LTX 2.5" }), { color: BRAND.green, fontWeight: "900", letterSpacing: "0.14em" }),
        el("h2", { textContent: "Motion Control Studio" }),
        el("p", { textContent: "Choose a starting image, describe the shot, draw one path for each object, then preview the motion before generating." }),
        el("p", { textContent: "Your first point anchors the object. Later points define where it travels from START to END." }),
      );
      welcome.append(card);
    } catch (error) {
      console.warn("[Doss Motion Node | LTX 2.5] Native App welcome enhancement was skipped.", error);
    }
  };
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(enhance, 0);
}

app.registerExtension({
  name: "Doss.LTXMotionStudio",
  async setup() {
    installWelcomeEnhancement();
  },
  async nodeCreated(node) {
    if (node.comfyClass === SETTINGS_NODE) setupSettings(node);
    if (node.comfyClass === STUDIO_NODE) setupStudio(node);
  },
});
