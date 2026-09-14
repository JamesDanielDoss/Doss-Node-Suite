export const CATEGORIES = ["Image", "Masks", "Video", "Audio", "Prompts", "Generation", "Workflow", "Diagnostics", "Output"];
export function matches(node, query) {
    const haystack = [node.name, node.category, node.description, ...node.aliases].join(" ").toLocaleLowerCase();
    return query.trim().toLocaleLowerCase().split(/\s+/).every(term => haystack.includes(term));
}
export function captureValues(widgets) {
    const values = {};
    for (const widget of widgets) {
        if (/password|secret|token|api.?key/i.test(widget.name) || widget.type === "button")
            continue;
        if (["string", "number", "boolean"].includes(typeof widget.value) && (typeof widget.value !== "number" || Number.isFinite(widget.value))) {
            values[widget.name] = widget.value;
        }
    }
    return values;
}
export function applyValues(node, values) {
    const missing = [];
    for (const [name, value] of Object.entries(values)) {
        const widget = node.widgets?.find(w => w.name === name);
        if (!widget) {
            missing.push(name);
            continue;
        }
        widget.value = value;
        widget.callback?.(value);
    }
    // Existing Doss DOM editors restore their views through their configure lifecycle.
    node.onConfigure?.({});
    return missing;
}
// These adapters keep graph mutations auditable and testable without a running browser.
export function transaction(graph, action) {
    graph.beforeChange?.();
    try {
        return action();
    }
    finally {
        graph.afterChange?.();
        graph.setDirtyCanvas?.(true, true);
    }
}
export function curvePolyline(points, width, height) {
    if (!points.length)
        return [];
    const xmin = points[0][0], xmax = points[points.length - 1][0];
    const ys = points.map(point => point[1]), ymin = Math.min(...ys), ymax = Math.max(...ys);
    return points.map(([x, y]) => [10 + (x - xmin) / (xmax - xmin || 1) * (width - 20), height - 10 - (y - ymin) / (ymax - ymin || 1) * (height - 20)]);
}
