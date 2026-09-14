// @ts-expect-error Host module supplied by ComfyUI.
import { app } from "../../scripts/app.js";
import { curvePolyline } from "./hub_model.js";
const typedNodes = new Set(["DossTypedSwitch", "DossBatchSelect", "DossBatchJoin"]);
function synchronizeType(node) {
    const type = node.widgets?.find((w) => w.name === "data_type")?.value;
    if (!type)
        return;
    for (const slot of node.inputs || []) {
        if (["a", "b", "batch"].includes(slot.name))
            slot.type = type;
    }
    if (node.outputs?.[0])
        node.outputs[0].type = type;
    node.graph?.setDirtyCanvas?.(true, true);
}
app.registerExtension({
    name: "Doss.Foundation",
    beforeRegisterNodeDef(nodeType, data) {
        if (!data.name?.startsWith("Doss"))
            return;
        if (typedNodes.has(data.name)) {
            const created = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function (...args) {
                const result = created?.apply(this, args);
                const widget = this.widgets?.find((w) => w.name === "data_type");
                if (widget) {
                    const callback = widget.callback;
                    widget.callback = (...values) => { callback?.apply(widget, values); synchronizeType(this); };
                }
                synchronizeType(this);
                return result;
            };
            const configured = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function (...args) {
                const result = configured?.apply(this, args);
                synchronizeType(this);
                return result;
            };
        }
        const reportNodes = new Set(["DossPromptRecipe", "DossValueSchedule", "DossModelInventory", "DossResolutionPlan", "DossInspector", "DossTableInput", "DossImageComparer", "DossAudioFinish", "DossClipTrim", "DossClipJoin", "DossVideoOutputPack"]);
        if (!reportNodes.has(data.name))
            return;
        const executed = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            executed?.call(this, message);
            if (!this.dossReport) {
                const container = document.createElement("div");
                Object.assign(container.style, { overflow: "auto", padding: "8px", color: "var(--input-text, #ddd)", background: "var(--comfy-input-bg, #222)", fontSize: "12px" });
                this.addDOMWidget("doss_report", "doss_report", container, { serialize: false, getMinHeight: () => 130 });
                this.dossReport = container;
            }
            this.dossReport.replaceChildren();
            const curve = message.doss_curve?.[0];
            if (curve) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("viewBox", "0 0 300 100");
                svg.setAttribute("role", "img");
                svg.setAttribute("aria-label", `Value schedule, index ${curve.index}, value ${curve.value}`);
                let points = curve.points;
                if (curve.interpolation === "step")
                    points = points.flatMap((point, i) => i ? [[point[0], points[i - 1][1]], point] : [point]);
                const polyline = document.createElementNS(svg.namespaceURI, "polyline");
                polyline.setAttribute("points", curvePolyline(points, 300, 100).map(p => p.join(",")).join(" "));
                polyline.setAttribute("fill", "none");
                polyline.setAttribute("stroke", "#67d5bb");
                polyline.setAttribute("stroke-width", "2");
                svg.append(polyline);
                this.dossReport.append(svg);
            }
            const text = document.createElement("pre");
            text.style.whiteSpace = "pre-wrap";
            text.style.margin = "0";
            text.textContent = (message.text || []).join("\n");
            this.dossReport.append(text);
            this.setSize?.([this.size[0], Math.max(this.size[1], this.computeSize()[1])]);
        };
    }
});
