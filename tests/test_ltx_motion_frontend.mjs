import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.style = {};
    this.textContent = "";
    this.value = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }
}

const animationFrames = [];
const windowMock = {
  requestAnimationFrame(callback) {
    animationFrames.push(callback);
    return animationFrames.length;
  },
};

function flushAnimationFrames() {
  while (animationFrames.length) {
    const callbacks = animationFrames.splice(0);
    for (const callback of callbacks) callback();
  }
}

const registeredExtensions = [];
const appMock = {
  registerExtension(extension) {
    registeredExtensions.push(extension);
  },
};
const sourcePath = new URL("../js/doss_ltx_motion.js", import.meta.url);
const source = readFileSync(sourcePath, "utf8").replace(/^import .*;\r?\n/gm, "");
vm.runInNewContext(source, {
  app: appMock,
  api: {},
  console,
  document: { createElement: (tagName) => new FakeElement(tagName) },
  window: windowMock,
}, { filename: sourcePath.pathname });

const extension = registeredExtensions.find((item) => item.name === "Doss.LTXMotionStudio");
assert.ok(extension, "The LTX Motion frontend extension must register.");

const values = {
  positive_prompt: "",
  duration_seconds: 5,
  negative_prompt: "",
  seed: 42,
  motion_strength: 1,
  image_adherence: 0.7,
  fps: "24",
};
const widgets = Object.entries(values).map(([name, value]) => ({
  name,
  value,
  callback() {},
}));
let domWidgetCount = 0;
let settingsRoot;
const node = {
  comfyClass: "DossLTXMotionSettings",
  widgets,
  size: [500, 540],
  onConfigure(info) {
    const restore = () => {
      for (const [name, value] of Object.entries(info.values)) {
        widgets.find((item) => item.name === name).value = value;
      }
    };
    if (info.defer) windowMock.requestAnimationFrame(restore);
    else restore();
  },
  addDOMWidget(_name, _type, root) {
    domWidgetCount += 1;
    settingsRoot = root;
    return {};
  },
  setDirtyCanvas() {},
  setSize(size) {
    this.size = [...size];
  },
};

await extension.nodeCreated(node);
const configured = node.onConfigure;
await extension.nodeCreated(node);
assert.equal(domWidgetCount, 1, "Repeated setup must not add another DOM widget.");
assert.equal(node.onConfigure, configured, "Repeated setup must not wrap onConfigure again.");
flushAnimationFrames();

function descendants(element) {
  return [element, ...element.children.flatMap(descendants)];
}

function control(label) {
  const labelElement = descendants(settingsRoot).find(
    (element) => element.tagName === "label" && element.textContent === label,
  );
  assert.ok(labelElement, `Missing ${label} control.`);
  return labelElement.children[0];
}

function assertControls(expected) {
  assert.equal(control("Positive prompt").value, String(expected.positive_prompt));
  assert.equal(control("Duration (seconds)").value, String(expected.duration_seconds));
  assert.equal(control("Negative prompt").value, String(expected.negative_prompt));
  assert.equal(control("Seed").value, String(expected.seed));
  assert.equal(control("Frame rate").value, String(expected.fps));
  assert.equal(control("Motion strength").value, String(expected.motion_strength));
  assert.equal(control("Image adherence").value, String(expected.image_adherence));
}

const synchronousRestore = {
  positive_prompt: "a synchronous saved prompt",
  duration_seconds: 6,
  negative_prompt: "saved negative",
  seed: 99,
  motion_strength: 0.85,
  image_adherence: 0.55,
  fps: "30",
};
node.onConfigure({ values: synchronousRestore });
assertControls(synchronousRestore);
flushAnimationFrames();

const deferredRestore = {
  positive_prompt: "two balls roll down a path",
  duration_seconds: 5,
  negative_prompt: "",
  seed: 42,
  motion_strength: 1,
  image_adherence: 0.7,
  fps: "24",
};
node.onConfigure({ values: deferredRestore, defer: true });
flushAnimationFrames();
assertControls(deferredRestore);

console.log("Doss Motion Settings frontend lifecycle: PASS");
