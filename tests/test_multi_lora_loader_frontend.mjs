import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.onclick = null;
    this.onchange = null;
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  set innerHTML(value) { this.children = []; this.textContent = String(value || ""); }
  get innerHTML() { return this.textContent; }
}

const extensions = [];
const appMock = { registerExtension(extension) { extensions.push(extension); } };
const apiMock = { apiURL(path) { return path; } };
const documentMock = { createElement(tagName) { return new FakeElement(tagName); } };
const fetchMock = async () => ({
  ok: true,
  async json() { return { loras: ["first.safetensors", "folder/second.safetensors"] }; },
});
const sourcePath = new URL("../js/doss_multi_lora_loader.js", import.meta.url);
const source = readFileSync(sourcePath, "utf8").replace(/^import .*;\r?\n/gm, "");
vm.runInNewContext(source, {
  app: appMock,
  api: apiMock,
  console,
  document: documentMock,
  fetch: fetchMock,
  structuredClone: (value) => JSON.parse(JSON.stringify(value)),
}, { filename: sourcePath.pathname });

const extension = extensions.find((item) => item.name === "Doss.MultiLoraLoader");
assert.ok(extension, "The Doss Multi-LoRA frontend extension must register.");

const stackWidget = {
  name: "lora_stack_json",
  value: '{"version":1,"entries":[]}',
  callback(value) { this.value = value; },
};
let root;
const node = {
  comfyClass: "DossMultiLoraLoader",
  widgets: [stackWidget],
  size: [400, 200],
  addDOMWidget(_name, _type, element) { root = element; return {}; },
  setDirtyCanvas() {},
  setSize(value) { this.size = [...value]; },
};
await extension.nodeCreated(node);

function descendants(element) {
  return [element, ...element.children.flatMap(descendants)];
}
function byText(text) {
  return descendants(root).find((element) => element.textContent === text);
}

const add = byText("+ Add LoRA");
assert.ok(add, "The node must expose an Add LoRA control.");
add.onclick();
let stack = JSON.parse(stackWidget.value);
assert.equal(stack.entries.length, 1);
assert.equal(stack.entries[0].name, "first.safetensors");
assert.equal(stack.entries[0].strength_model, 1);
assert.equal(stack.entries[0].strength_clip, 1);

let numbers = descendants(root).filter((element) => element.tagName === "input" && element.type === "number");
assert.equal(numbers.length, 2, "Each LoRA row must expose MODEL and CLIP weights.");
assert.equal(numbers[0].value, "1.00");
assert.equal(numbers[1].value, "1.00");
const enabled = descendants(root).find((element) => element.tagName === "input" && element.type === "checkbox");
enabled.checked = false;
enabled.onchange();
assert.ok(descendants(root).some((element) => element.style.opacity === "0.42"), "Unchecked rows must be visually subdued.");
numbers[0].value = "-2";
numbers[0].onchange();
stack = JSON.parse(stackWidget.value);
assert.equal(stack.entries[0].strength_model, -2);
assert.equal(stack.entries[0].strength_clip, 1);

const remove = byText("×");
assert.ok(remove, "Each LoRA row must expose a remove control.");
remove.onclick();
stack = JSON.parse(stackWidget.value);
assert.equal(stack.entries.length, 0);
assert.equal(stackWidget.type, "converted-widget");
assert.equal(stackWidget.hidden, true);
assert.equal(typeof stackWidget.draw, "function");
assert.ok(node.size[0] >= 520);

// Reordering must move the whole independently weighted record, not just its name.
add.onclick(); add.onclick();
const selects = descendants(root).filter(element => element.tagName === "select");
selects[1].value = "folder/second.safetensors"; selects[1].onchange();
const weights = descendants(root).filter(element => element.type === "number");
weights[2].value = "0.35"; weights[2].onchange();
const earlier = descendants(root).filter(element => element.title === "Move LoRA earlier");
assert.equal(earlier[0].disabled, true); earlier[1].onclick();
stack = JSON.parse(stackWidget.value);
assert.equal(stack.entries[0].name, "folder/second.safetensors");
assert.equal(stack.entries[0].strength_model, 0.35);
assert.equal(stack.entries[1].name, "first.safetensors");
