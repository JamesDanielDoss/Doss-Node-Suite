export interface CatalogNode {
  id: string; name: string; category: string; description: string; advantage: string;
  aliases: string[]; example?: string; inputs: string[]; outputs: string[];
  presets: { name: string; values: Record<string, string | number | boolean> }[];
}
export interface UserPreset {
  id: string; name: string; node_id: string; values: Record<string, string | number | boolean | null>;
}
export interface Preferences { schema_version: 1; favorites: string[]; presets: UserPreset[] }
export interface Catalog {
  schema_version: 1; version: string; nodes: CatalogNode[];
  workflows: { name: string; file: string; description: string; category: string }[];
  links: Record<string, string>;
}

export const CATEGORIES = ["Image", "Masks", "Video", "Audio", "Prompts", "Generation", "Workflow", "Diagnostics", "Output"];
export function matches(node: CatalogNode, query: string): boolean {
  const haystack = [node.name, node.category, node.description, ...node.aliases].join(" ").toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every(term => haystack.includes(term));
}
export function captureValues(widgets: {name: string; value: unknown; type?: string}[]): UserPreset["values"] {
  const values: UserPreset["values"] = {};
  for (const widget of widgets) {
    if (/password|secret|token|api.?key/i.test(widget.name) || widget.type === "button") continue;
    if (["string", "number", "boolean"].includes(typeof widget.value) && (typeof widget.value !== "number" || Number.isFinite(widget.value))) {
      values[widget.name] = widget.value as string | number | boolean;
    }
  }
  return values;
}
export function applyValues(node: {widgets?: {name: string; value: unknown; callback?: (...args: unknown[]) => void}[]; onConfigure?: (info: unknown) => void}, values: UserPreset["values"]): string[] {
  const missing: string[] = [];
  for (const [name, value] of Object.entries(values)) {
    const widget = node.widgets?.find(w => w.name === name);
    if (!widget) { missing.push(name); continue; }
    widget.value = value;
    widget.callback?.(value);
  }
  // Existing Doss DOM editors restore their views through their configure lifecycle.
  node.onConfigure?.({});
  return missing;
}

// These adapters keep graph mutations auditable and testable without a running browser.
export function transaction<T>(graph: {beforeChange?: () => void; afterChange?: () => void; setDirtyCanvas?: (...args: boolean[]) => void}, action: () => T): T {
  graph.beforeChange?.();
  try { return action(); }
  finally { graph.afterChange?.(); graph.setDirtyCanvas?.(true, true); }
}

export function curvePolyline(points: number[][], width: number, height: number): number[][] {
  if (!points.length) return [];
  const xmin = points[0][0], xmax = points[points.length - 1][0];
  const ys = points.map(point => point[1]), ymin = Math.min(...ys), ymax = Math.max(...ys);
  return points.map(([x, y]) => [10 + (x - xmin) / (xmax - xmin || 1) * (width - 20), height - 10 - (y - ymin) / (ymax - ymin || 1) * (height - 20)]);
}
