import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const animationFrames = [];
const canceledAnimationFrames = [];
let nextAnimationFrameId = 1;
function flushAnimationFrames() {
  while (animationFrames.length) {
    const frames = animationFrames.splice(0);
    for (const frame of frames) frame.callback();
  }
}

class FakeContext {
  constructor() {
    this.lastImageRect = null;
    this.clearCount = 0;
    this.arcs = [];
  }

  clearRect() {
    this.clearCount += 1;
    this.arcs = [];
  }
  fillRect() {}
  fillText() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  arc(x, y, radius) {
    this.arcs.push({ x, y, radius });
  }
  fill() {}

  drawImage(_image, x, y, width, height) {
    this.lastImageRect = { x, y, width, height };
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.style = {};
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.visualScale = 1;
    this.rectLeft = 100;
    this.rectTop = 50;
    this._clientWidth = 0;
    this._clientHeight = 0;
    this._innerHTML = "";
    this.context = tagName === "canvas" ? new FakeContext() : null;
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  get clientWidth() {
    return this._clientWidth || Number.parseFloat(this.style.width) || 0;
  }

  set clientWidth(value) {
    this._clientWidth = value;
  }

  get clientHeight() {
    return this._clientHeight || Number.parseFloat(this.style.height) || 0;
  }

  set clientHeight(value) {
    this._clientHeight = value;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === "") this.children = [];
  }

  getBoundingClientRect() {
    const width = (Number.parseFloat(this.style.width) || this.clientWidth) * this.visualScale;
    const height = (Number.parseFloat(this.style.height) || this.clientHeight) * this.visualScale;
    return { left: this.rectLeft, top: this.rectTop, width, height };
  }

  getContext() {
    return this.context;
  }

  setPointerCapture() {}
  releasePointerCapture() {}
}

class FakeImage {
  constructor() {
    this.naturalWidth = 1535;
    this.naturalHeight = 1024;
  }

  set src(value) {
    this._src = value;
    this.onload?.();
  }

  get src() {
    return this._src;
  }
}

const resizeObservers = [];
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    resizeObservers.push(this);
  }

  observe(element) {
    this.element = element;
  }

  disconnect() {
    this.disconnected = true;
  }

  trigger() {
    this.callback([{ target: this.element }]);
  }
}

const registeredExtensions = [];
const loadImageNode = {
  widgets: [{ name: "image", value: "Red and Blue Ball.png" }],
};
const appMock = {
  graph: {
    links: { 91: { origin_id: 1 } },
    getNodeById(id) {
      return id === 1 ? loadImageNode : null;
    },
  },
  registerExtension(extension) {
    registeredExtensions.push(extension);
  },
};
const windowMock = {
  devicePixelRatio: 2,
  requestAnimationFrame(callback) {
    const id = nextAnimationFrameId++;
    animationFrames.push({ id, callback });
    return id;
  },
  cancelAnimationFrame(id) {
    const index = animationFrames.findIndex((frame) => frame.id === id);
    if (index >= 0) animationFrames.splice(index, 1);
    canceledAnimationFrames.push(id);
  },
  setInterval() {
    this.intervalCount = (this.intervalCount || 0) + 1;
    return 17;
  },
  clearInterval() {},
};

const sourcePath = new URL("../js/doss_ltx_motion.js", import.meta.url);
const source = readFileSync(sourcePath, "utf8").replace(/^import .*;\r?\n/gm, "");
vm.runInNewContext(source, {
  app: appMock,
  api: { apiURL: (path) => path },
  console,
  document: { createElement: (tagName) => new FakeElement(tagName) },
  window: windowMock,
  Image: FakeImage,
  ResizeObserver: FakeResizeObserver,
}, { filename: sourcePath.pathname });

const extension = registeredExtensions.find((item) => item.name === "Doss.LTXMotionStudio");
assert.ok(extension, "The LTX Motion frontend extension must register.");

const initialPlan = {
  schemaVersion: 1,
  source: { ref: "Red and Blue Ball.png", width: 1535, height: 1024 },
  stale: false,
  tracks: [{
    id: "track-1",
    name: "Road path",
    color: "#ef4444",
    points: [{ x: 0.2, y: 0.75 }, { x: 0.48, y: 0.42 }],
  }],
};
const widgets = [
  { name: "motion_plan", value: JSON.stringify(initialPlan), callback() {} },
  { name: "source_ref", value: "Red and Blue Ball.png", callback() {} },
];
let studioRoot;
let studioOptions;
let domWidgetCount = 0;
const node = {
  comfyClass: "DossLTXMotionStudio",
  inputs: [{ name: "image", link: 91 }],
  widgets,
  size: [720, 680],
  addDOMWidget(name, _type, root, options) {
    if (name === "motion_studio") {
      domWidgetCount += 1;
      studioRoot = root;
      studioOptions = options;
    }
    return {};
  },
  setDirtyCanvas() {},
  setSize(size) {
    this.size = [...size];
  },
};

await extension.nodeCreated(node);
flushAnimationFrames();
const configured = node.onConfigure;
const resized = node.onResize;
const removed = node.onRemoved;
await extension.nodeCreated(node);
assert.equal(domWidgetCount, 1, "Repeated setup must not add another Motion Studio DOM widget.");
assert.equal(node.onConfigure, configured, "Repeated setup must not wrap onConfigure again.");
assert.equal(node.onResize, resized, "Repeated setup must not wrap onResize again.");
assert.equal(node.onRemoved, removed, "Repeated setup must not wrap onRemoved again.");
assert.equal(resizeObservers.length, 1, "Repeated setup must not add another resize observer.");
assert.equal(windowMock.intervalCount, 1, "Repeated setup must not add another image poller.");

function descendants(element) {
  return [element, ...element.children.flatMap(descendants)];
}

const canvas = descendants(studioRoot).find(
  (element) => element.dataset.testid === "doss-motion-canvas",
);
assert.ok(canvas, "The Motion Studio canvas must exist.");
const canvasFrame = canvas.parentElement;
assert.ok(canvasFrame, "The Motion Studio canvas must have a sizing frame.");
assert.ok(studioOptions?.afterResize, "The DOM widget must expose its resize lifecycle.");
assert.equal(resizeObservers.length, 1, "The canvas frame must be observed for layout changes.");

const gridAreas = [...studioRoot.style.gridTemplateAreas.matchAll(/"([^"]+)"/g)]
  .map((match) => match[1]);
const gridRows = studioRoot.style.gridTemplateRows.match(/minmax\([^)]*\)|[^\s]+/g);
const sourceBanner = descendants(studioRoot).find(
  (element) => element.dataset.testid === "doss-motion-source-banner",
);
assert.deepEqual(
  gridAreas,
  ["title", "banner", "toolbar", "canvas", "status", "help", "preview"],
  "Every root child must retain an explicit row when the optional banner is hidden.",
);
assert.equal(sourceBanner.style.display, "none", "The unchanged-source banner starts hidden.");
assert.equal(sourceBanner.style.gridArea, "banner", "The hidden banner must keep its own collapsible row.");
assert.equal(gridRows[gridAreas.indexOf("banner")], "auto", "The hidden banner row must collapse.");
assert.equal(canvasFrame.style.gridArea, "canvas", "The image frame must own the canvas grid area.");
assert.equal(
  gridRows[gridAreas.indexOf(canvasFrame.style.gridArea)],
  "minmax(240px, 1fr)",
  "The image frame, not status text, must own the only expandable row.",
);

function dimensions() {
  return {
    cssWidth: Number.parseFloat(canvas.style.width),
    cssHeight: Number.parseFloat(canvas.style.height),
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
  };
}

function assertContainedAspect(expectedWidth, expectedHeight) {
  const actual = dimensions();
  assert.ok(actual.cssWidth <= expectedWidth, "Canvas width must remain inside its frame.");
  assert.ok(actual.cssHeight <= expectedHeight, "Canvas height must remain inside its frame.");
  assert.ok(
    Math.abs(actual.cssWidth / actual.cssHeight - 1535 / 1024) < 0.005,
    "Canvas CSS dimensions must preserve the source image aspect ratio.",
  );
  assert.ok(
    Math.abs(actual.pixelWidth / actual.pixelHeight - 1535 / 1024) < 0.005,
    "Canvas backing dimensions must preserve the source image aspect ratio.",
  );
  assert.deepEqual(
    canvas.context.lastImageRect,
    { x: 0, y: 0, width: actual.pixelWidth, height: actual.pixelHeight },
    "The complete image must render into the complete backing canvas.",
  );
}

canvasFrame.clientWidth = 600;
canvasFrame.clientHeight = 400;
studioOptions.afterResize();
flushAnimationFrames();
assertContainedAspect(600, 400);
const baseline = dimensions();

for (const visualScale of [0.5, 1.75, 0.33, 1]) {
  canvas.visualScale = visualScale;
  studioOptions.afterResize();
  flushAnimationFrames();
  assert.deepEqual(
    dimensions(),
    baseline,
    "Graph zoom must not feed transformed screen dimensions back into canvas layout.",
  );
}

const sameImagePlan = structuredClone(initialPlan);
sameImagePlan.tracks[0].points = [{ x: 0.15, y: 0.78 }, { x: 0.88, y: 0.12 }];
widgets.find((item) => item.name === "motion_plan").value = JSON.stringify(sameImagePlan);
const rendersBeforeConfigure = canvas.context.clearCount;
node.onConfigure({});
assert.equal(
  canvas.context.clearCount,
  rendersBeforeConfigure,
  "Saved-path repaint should be scheduled after configuration rather than racing widget restore.",
);
flushAnimationFrames();
assert.ok(canvas.context.clearCount > rendersBeforeConfigure, "Same-image configuration must repaint the canvas.");
assert.ok(
  canvas.context.arcs.some(
    (arc) => Math.abs(arc.x - 0.88 * canvas.width) < 1 && Math.abs(arc.y - 0.12 * canvas.height) < 1,
  ),
  "The repaint must draw newly restored path coordinates even when the image filename is unchanged.",
);

canvas.visualScale = 0.5;
const zoomedRect = canvas.getBoundingClientRect();
const click = {
  button: 0,
  pointerId: 4,
  clientX: zoomedRect.left + zoomedRect.width * 0.82,
  clientY: zoomedRect.top + zoomedRect.height * 0.18,
  preventDefault() {},
  stopPropagation() {},
};
canvas.listeners.get("pointerdown")(click);
const clickedPlan = JSON.parse(widgets.find((item) => item.name === "motion_plan").value);
const clickedPoint = clickedPlan.tracks[0].points.at(-1);
assert.ok(Math.abs(clickedPoint.x - 0.82) < 1e-9, "Click X must map correctly at graph zoom.");
assert.ok(Math.abs(clickedPoint.y - 0.18) < 1e-9, "Click Y must map correctly at graph zoom.");
assert.deepEqual(
  dimensions(),
  baseline,
  "A click and its hit test must not mutate canvas dimensions.",
);

canvasFrame.clientWidth = 480;
canvasFrame.clientHeight = 520;
node.onResize();
flushAnimationFrames();
assertContainedAspect(480, 520);

canvasFrame.clientWidth = 900;
canvasFrame.clientHeight = 300;
resizeObservers[0].trigger();
flushAnimationFrames();
assertContainedAspect(900, 300);

const rendersBeforeRemoval = canvas.context.clearCount;
studioOptions.afterResize();
assert.equal(animationFrames.length, 1, "A resize should have one coalesced pending repaint.");
node.onRemoved();
assert.equal(resizeObservers[0].disconnected, true, "The resize observer must be disconnected on removal.");
assert.equal(canceledAnimationFrames.length, 1, "Removal must cancel the pending repaint.");
flushAnimationFrames();
assert.equal(canvas.context.clearCount, rendersBeforeRemoval, "A removed node must not repaint later.");

console.log("Doss Motion Studio responsive canvas lifecycle: PASS");
