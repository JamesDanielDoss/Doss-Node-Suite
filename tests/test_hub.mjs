import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {matches, captureValues, applyValues, transaction, curvePolyline} from "../js/hub_model.js";

const catalog = JSON.parse(fs.readFileSync(new URL("../catalog.json", import.meta.url)));
test("catalogue covers 33 tools and all category examples", () => {
  assert.equal(catalog.nodes.length, 33);
  assert.equal(new Set(catalog.nodes.map(n => n.id)).size, 33);
  assert.equal(catalog.workflows.length, 9);
  assert(catalog.nodes.some(n => n.id === "Doss Label Maker"));
});
test("search is case-insensitive and matches every word across fields", () => {
  const node = catalog.nodes.find(n => n.id === "DossMaskRefine");
  assert(matches(node, "MASK feather")); assert(!matches(node, "mask audio")); assert(matches(node, "  "));
});
test("preset capture excludes transient controls and credentials", () => {
  assert.deepEqual(captureValues([{name:"steps",value:20},{name:"api_key",value:"private"},{name:"run",value:"Run",type:"button"},{name:"view",value:{}},{name:"cfg",value:NaN}]), {steps:20});
});
test("presets restore widget lifecycle and report removed settings", () => {
  const calls = [];
  const node = {widgets:[{name:"steps",value:10,callback:value => calls.push(value)}],onConfigure:() => calls.push("configure")};
  assert.deepEqual(applyValues(node, {steps:30,removed:1}), ["removed"]);
  assert.equal(node.widgets[0].value,30); assert.deepEqual(calls,[30,"configure"]);
});
test("graph edits bracket undo transactions, including failures", () => {
  const calls=[]; const graph={beforeChange:()=>calls.push("before"),afterChange:()=>calls.push("after"),setDirtyCanvas:()=>calls.push("draw")};
  assert.throws(()=>transaction(graph,()=>{calls.push("edit");throw Error("failed");}));
  assert.deepEqual(calls,["before","edit","after","draw"]);
});
test("curve preview has finite coordinates for constant and single-point schedules", () => {
  for (const points of [[[0,1]],[[0,1],[24,1]],[[0,-1],[12,1],[24,0]]]) {
    const line=curvePolyline(points,300,100); assert(line.flat().every(Number.isFinite));
  }
});
