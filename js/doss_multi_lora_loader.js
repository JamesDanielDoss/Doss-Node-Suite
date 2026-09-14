import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "DossMultiLoraLoader";
const STACK_VERSION = 2;
const MAX_ENTRIES = 32;
const EMPTY_STACK = { version: STACK_VERSION, entries: [] };

function findWidget(node, name) {
  return node.widgets?.find((widget) => widget.name === name);
}

function el(tag, styles = {}) {
  const element = document.createElement(tag);
  Object.assign(element.style, styles);
  return element;
}

function button(label, tone = "neutral") {
  const element = el("button", {
    border: tone === "danger" ? "1px solid rgba(239,68,68,0.8)" : "1px solid rgba(34,197,94,0.65)",
    background: tone === "danger" ? "rgba(127,29,29,0.75)" : "rgba(13,44,27,0.85)",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
    fontWeight: "700",
  });
  element.type = "button";
  element.textContent = label;
  return element;
}

function parseStack(widget) {
  try {
    const parsed = JSON.parse(String(widget?.value || ""));
    if (![1, STACK_VERSION].includes(parsed?.version) || !Array.isArray(parsed.entries)) return structuredClone(EMPTY_STACK);
    return {
      version: STACK_VERSION,
      entries: parsed.entries.slice(0, MAX_ENTRIES).map((entry) => ({
        name: String(entry?.name || ""),
        strength_model: Number.isFinite(Number(entry?.strength_model ?? entry?.strength)) ? Number(entry.strength_model ?? entry.strength) : 1,
        strength_clip: Number.isFinite(Number(entry?.strength_clip ?? entry?.strength)) ? Number(entry.strength_clip ?? entry.strength) : 1,
        enabled: entry?.enabled !== false,
      })).filter((entry) => entry.name),
    };
  } catch (_) {
    return structuredClone(EMPTY_STACK);
  }
}

async function fetchLoras() {
  const response = await fetch(api.apiURL("/doss/multi_lora_loader/loras"));
  const data = await response.json();
  if (!response.ok || !Array.isArray(data?.loras)) {
    throw new Error(data?.error || "Could not list LoRA files.");
  }
  return data.loras.map(String);
}

async function setupNode(node) {
  if (node.dossMultiLoraReady) return;
  node.dossMultiLoraReady = true;
  const stackWidget = findWidget(node, "lora_stack_json");
  if (!stackWidget) return;

  stackWidget.computeSize = () => [0, -4];
  stackWidget.type = "converted-widget";
  stackWidget.hidden = true;
  stackWidget.draw = () => {};
  const state = { stack: parseStack(stackWidget), names: [], error: "" };

  const root = el("div", {
    boxSizing: "border-box",
    width: "100%",
    minHeight: "150px",
    padding: "12px",
    border: "1px solid rgba(34,197,94,0.55)",
    borderRadius: "14px",
    background: "linear-gradient(145deg, rgba(3,14,8,0.97), rgba(8,32,20,0.94))",
    color: "#ffffff",
    fontFamily: "Inter, system-ui, sans-serif",
  });
  const heading = el("div", { color: "#22c55e", fontWeight: "900", letterSpacing: "0.12em", marginBottom: "10px" });
  heading.textContent = "DOSS MULTI-LORA LOADER";
  const rows = el("div", { display: "flex", flexDirection: "column", gap: "8px" });
  const status = el("div", { minHeight: "16px", marginTop: "8px", fontSize: "12px", color: "#fbbf24" });
  const actions = el("div", { display: "flex", gap: "8px", marginTop: "10px" });
  const addButton = button("+ Add LoRA");
  const refreshButton = button("Refresh");
  actions.append(addButton, refreshButton);
  root.append(heading, rows, status, actions);

  function commit() {
    stackWidget.value = JSON.stringify(state.stack);
    stackWidget.callback?.(stackWidget.value);
    node.setDirtyCanvas?.(true, true);
  }

  function fitHeight() {
    const height = 190 + Math.max(1, state.stack.entries.length) * 90;
    node.setSize?.([Math.max(node.size?.[0] || 520, 520), Math.max(height, 236)]);
  }

  function option(select, value, label = value) {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    select.append(item);
  }

  function render() {
    rows.innerHTML = "";
    status.textContent = state.error;
    if (!state.stack.entries.length) {
      const empty = el("div", { opacity: "0.72", padding: "10px 4px" });
      empty.textContent = state.names.length ? "No LoRAs added." : "No LoRA files found. Click Refresh after installing one.";
      rows.append(empty);
    }
    if (state.stack.entries.length) {
      const header = el("div", { display: "grid", gridTemplateColumns: "28px minmax(170px,1fr) 78px 78px 38px", gap: "8px", alignItems: "center", color: "#94a3b8", fontSize: "11px", fontWeight: "800", letterSpacing: "0.05em" });
      ["", "LoRA", "MODEL", "CLIP", ""].forEach((label) => { const cell = el("div"); cell.textContent = label; header.append(cell); });
      rows.append(header);
    }
    state.stack.entries.forEach((entry, index) => {
      const row = el("div", { display: "grid", gridTemplateColumns: "28px minmax(170px,1fr) 78px 78px 38px", gap: "8px", alignItems: "center", opacity: entry.enabled ? "1" : "0.42", filter: entry.enabled ? "none" : "saturate(0.35)" });
      const enabled = document.createElement("input");
      enabled.type = "checkbox";
      enabled.checked = entry.enabled;
      enabled.title = "Enable this LoRA";
      enabled.onchange = () => { entry.enabled = enabled.checked; commit(); render(); };

      const select = document.createElement("select");
      Object.assign(select.style, { minWidth: "0", padding: "7px", borderRadius: "7px", color: "#ffffff", background: "#111827", border: "1px solid rgba(255,255,255,0.22)" });
      if (entry.name && !state.names.includes(entry.name)) option(select, entry.name, `[Missing] ${entry.name}`);
      state.names.forEach((name) => option(select, name));
      select.value = entry.name;
      select.onchange = () => { entry.name = select.value; commit(); };

      function weightInput(field, title) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "-100";
        input.max = "100";
        input.step = "0.05";
        input.value = Number(entry[field]).toFixed(2);
        input.title = title;
        Object.assign(input.style, { width: "100%", boxSizing: "border-box", padding: "7px", borderRadius: "7px", color: entry.enabled ? "#ffffff" : "#94a3b8", background: "#111827", border: "1px solid rgba(255,255,255,0.22)" });
        input.onchange = () => {
          const value = Number(input.value);
          entry[field] = Number.isFinite(value) ? Math.max(-100, Math.min(100, value)) : 1;
          input.value = Number(entry[field]).toFixed(2);
          commit();
        };
        return input;
      }
      const strengthModel = weightInput("strength_model", "MODEL weight");
      const strengthClip = weightInput("strength_clip", "CLIP weight");

      const remove = button("×", "danger");
      remove.title = "Remove LoRA";
      remove.onclick = () => {
        state.stack.entries.splice(index, 1);
        commit();
        render();
      };
      const order = el("div", { display: "flex", flexDirection: "column", gap: "2px" });
      const up = button("↑"), down = button("↓");
      up.title = "Move LoRA earlier";
      down.title = "Move LoRA later";
      up.disabled = index === 0;
      down.disabled = index === state.stack.entries.length - 1;
      const move = (offset) => {
        const target = index + offset;
        if (target < 0 || target >= state.stack.entries.length) return;
        [state.stack.entries[index], state.stack.entries[target]] = [state.stack.entries[target], state.stack.entries[index]];
        commit(); render();
      };
      up.onclick = () => move(-1);
      down.onclick = () => move(1);
      order.append(up, down, remove);
      row.append(enabled, select, strengthModel, strengthClip, order);
      rows.append(row);
    });
    fitHeight();
  }

  async function refresh() {
    try {
      state.names = await fetchLoras();
      state.error = "";
    } catch (error) {
      state.error = error.message;
    }
    render();
  }

  addButton.onclick = () => {
    if (state.stack.entries.length >= MAX_ENTRIES) {
      state.error = `Maximum ${MAX_ENTRIES} LoRAs.`;
      render();
      return;
    }
    const firstUnused = state.names.find((name) => !state.stack.entries.some((entry) => entry.name === name));
    const name = firstUnused || state.names[0];
    if (!name) {
      state.error = "Install a LoRA file, then click Refresh.";
      render();
      return;
    }
    state.stack.entries.push({ name, strength_model: 1, strength_clip: 1, enabled: true });
    state.error = "";
    commit();
    render();
  };
  refreshButton.onclick = refresh;

  node.addDOMWidget("doss_multi_lora_stack", "DossMultiLoraStack", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => 190 + Math.max(1, state.stack.entries.length) * 90,
  });

  const originalConfigure = node.onConfigure;
  node.onConfigure = function () {
    originalConfigure?.apply(this, arguments);
    state.stack = parseStack(stackWidget);
    render();
  };

  render();
  await refresh();
}

app.registerExtension({
  name: "Doss.MultiLoraLoader",
  async nodeCreated(node) {
    if (node.comfyClass === NODE_TYPE || node.type === NODE_TYPE) await setupNode(node);
  },
});
