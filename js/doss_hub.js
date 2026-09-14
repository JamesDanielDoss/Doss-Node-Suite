// ComfyUI supplies these modules at runtime; they are not bundled into the extension.
// @ts-expect-error Host module supplied by ComfyUI.
import { app } from "../../scripts/app.js";
// @ts-expect-error Host module supplied by ComfyUI.
import { api } from "../../scripts/api.js";
import { CATEGORIES, matches, captureValues, applyValues, transaction } from "./hub_model.js";
const PREFS_EMPTY = { schema_version: 1, favorites: [], presets: [] };
let catalog;
let preferences = structuredClone(PREFS_EMPTY);
let objectInfo = {};
let activeTab = "Tools", query = "", favoritesOnly = false;
let root = null;
let body, statusLine;
let writeQueue = Promise.resolve();
function el(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className)
        element.className = className;
    if (text)
        element.textContent = text;
    return element;
}
function button(label, action, className = "") {
    const result = el("button", `doss-button ${className}`, label);
    result.type = "button";
    result.onclick = () => { Promise.resolve().then(action).catch(showError); };
    return result;
}
function message(text, error = false) {
    if (!statusLine)
        return;
    statusLine.textContent = text;
    statusLine.dataset.error = String(error);
}
function showError(error) { message(error instanceof Error ? error.message : String(error), true); }
async function request(path, init) {
    const response = await api.fetchApi(path, init);
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `Doss request failed (${response.status}). Restart ComfyUI after installing or updating the suite.`);
    }
    return await response.json();
}
function savePreferences() {
    const snapshot = JSON.stringify(preferences);
    writeQueue = writeQueue.catch(() => undefined).then(async () => {
        await request("/doss/hub/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: snapshot });
    });
    return writeQueue;
}
function centerPosition() {
    const canvas = app.canvas;
    const scale = canvas?.ds?.scale || 1, offset = canvas?.ds?.offset || [0, 0];
    return [(canvas?.canvas?.width || 1000) / 2 / scale - offset[0], (canvas?.canvas?.height || 700) / 2 / scale - offset[1]];
}
function addNode(id, values) {
    const node = LiteGraph.createNode(id);
    if (!node)
        throw new Error(`Node ${id} is unavailable. Restart ComfyUI after updating Doss.`);
    transaction(app.graph, () => {
        node.pos = centerPosition();
        app.graph.add(node);
        if (values)
            applyValues(node, values);
        app.canvas.selectNode?.(node);
    });
    message(`${node.title || id} added. Undo with Ctrl/Cmd+Z.`);
    return node;
}
async function insertExample(file) {
    const workflow = await request(`/doss/hub/examples/${encodeURIComponent(file)}`);
    const records = workflow.nodes || [];
    if (!records.length)
        throw new Error("This example contains no nodes.");
    const prepared = [];
    for (const record of records) {
        const node = LiteGraph.createNode(record.type);
        if (!node)
            throw new Error(`Example requires ${record.type}. Install the listed dependency before inserting it.`);
        prepared.push({ record, node });
    }
    const [ox, oy] = centerPosition();
    const minX = Math.min(...records.map((n) => n.pos[0])), minY = Math.min(...records.map((n) => n.pos[1]));
    transaction(app.graph, () => {
        const map = new Map();
        try {
            for (const { record, node } of prepared) {
                app.graph.add(node);
                const configuration = structuredClone(record);
                for (const input of configuration.inputs || [])
                    input.link = null;
                for (const output of configuration.outputs || [])
                    output.links = null;
                configuration.id = node.id;
                configuration.pos = [record.pos[0] - minX + ox, record.pos[1] - minY + oy];
                node.configure(configuration);
                map.set(record.id, node);
            }
            for (const link of workflow.links || []) {
                if (!map.get(link[1])?.connect(link[2], map.get(link[3]), link[4]))
                    throw new Error("An example connection could not be restored.");
            }
            app.canvas.selectNodes?.(prepared.map(item => item.node));
        }
        catch (error) {
            for (const { node } of prepared)
                if (node.graph)
                    app.graph.remove(node);
            throw error;
        }
    });
    message(`Inserted ${prepared.length} example nodes. Your existing workflow is preserved; Ctrl/Cmd+Z undoes insertion.`);
}
function selectedNode() {
    const nodes = Object.values(app.canvas?.selected_nodes || {});
    if (nodes.length !== 1 || !catalog.nodes.some(n => n.id === (nodes[0].comfyClass || nodes[0].type)))
        throw new Error("Select exactly one Doss node on the canvas first.");
    return nodes[0];
}
function portList(label, ports) {
    const block = el("div", "doss-ports");
    block.append(el("strong", "", label), el("span", "", ports.length ? ports.join(" · ") : "None"));
    return block;
}
function nodeCard(node) {
    const card = el("article", "doss-card");
    const heading = el("div", "doss-card-heading");
    const title = el("h3", "", node.name.replace(/^Doss /, ""));
    const favored = preferences.favorites.includes(node.id);
    const favorite = button(favored ? "★" : "☆", async () => {
        preferences.favorites = favored ? preferences.favorites.filter(id => id !== node.id) : [...preferences.favorites, node.id];
        await savePreferences();
        renderBody();
    }, "doss-favorite");
    favorite.setAttribute("aria-label", `${favored ? "Unfavorite" : "Favorite"} ${node.name}`);
    favorite.setAttribute("aria-pressed", String(favored));
    heading.append(title, favorite);
    const actions = el("div", "doss-actions");
    const add = button("Add node", () => addNode(node.id), "doss-primary");
    const available = Boolean(objectInfo[node.id]) || node.id === "Doss Label Maker";
    add.disabled = !available;
    if (!available)
        add.title = "Node unavailable: restart ComfyUI after installing the update.";
    actions.append(add);
    if (node.example)
        actions.append(button("Example", () => insertExample(node.example)));
    const help = el("details", "doss-help");
    help.append(el("summary", "", "Connections & guide"), el("p", "", node.description), el("p", "doss-advantage", node.advantage), portList("Inputs", node.inputs), portList("Outputs", node.outputs));
    for (const preset of node.presets)
        help.append(button(`Add · ${preset.name}`, () => addNode(node.id, preset.values)));
    card.append(heading, el("p", "doss-description", node.description), actions, help);
    return card;
}
function toolsView() {
    const filtered = catalog.nodes.filter(node => matches(node, query) && (!favoritesOnly || preferences.favorites.includes(node.id)));
    body.append(el("p", "doss-count", `${filtered.length} tools${query ? ` matching “${query}”` : " ready to explore"}`));
    if (!filtered.length) {
        body.append(el("p", "doss-empty", favoritesOnly ? "Favorite tools with the star beside their name to keep them here." : "No tools match. Try image, mask, trim, seed, or batch."));
        return;
    }
    for (const category of CATEGORIES) {
        const nodes = filtered.filter(node => node.category === category);
        if (!nodes.length)
            continue;
        const section = el("details", "doss-category");
        section.open = Boolean(query || favoritesOnly || category === "Image");
        const summary = el("summary");
        summary.append(el("span", "", category), el("span", "doss-category-count", String(nodes.length)));
        section.append(summary, ...nodes.map(nodeCard));
        body.append(section);
    }
}
function workflowsView() {
    body.append(el("h2", "", "Start with a working example"), el("p", "doss-muted", "Examples insert into your canvas. They never replace or run your workflow automatically."));
    for (const item of catalog.workflows) {
        if (query && !`${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
            continue;
        const card = el("article", "doss-card");
        card.append(el("span", "doss-eyebrow", item.category), el("h3", "", item.name), el("p", "", item.description), button("Insert workflow", () => insertExample(item.file), "doss-primary"));
        body.append(card);
    }
    const organizer = el("section", "doss-card");
    organizer.append(el("h3", "", "Organize your canvas"));
    const name = el("input", "doss-input");
    name.placeholder = "Group title";
    name.setAttribute("aria-label", "Group title");
    name.value = "Doss · Working group";
    organizer.append(name, button("Group selected nodes", () => {
        const nodes = Object.values(app.canvas?.selected_nodes || {});
        if (!nodes.length)
            throw new Error("Select nodes on the canvas first.");
        transaction(app.graph, () => {
            const group = new LiteGraph.LGraphGroup(name.value.trim() || "Doss group");
            const x = Math.min(...nodes.map(n => n.pos[0])) - 30, y = Math.min(...nodes.map(n => n.pos[1])) - 60;
            const right = Math.max(...nodes.map(n => n.pos[0] + n.size[0])) + 30, bottom = Math.max(...nodes.map(n => n.pos[1] + n.size[1])) + 30;
            group.pos = [x, y];
            group.size = [right - x, bottom - y];
            group.color = "#397b70";
            app.graph.add(group);
        });
        message("Group created. Ctrl/Cmd+Z undoes this change.");
        renderBody();
    }));
    body.append(organizer);
    for (const group of app.graph?._groups || []) {
        body.append(button(`Go to ${group.title}`, () => {
            const ds = app.canvas.ds;
            const centerX = group.pos[0] + group.size[0] / 2, centerY = group.pos[1] + group.size[1] / 2;
            ds.offset = [app.canvas.canvas.width / 2 / ds.scale - centerX, app.canvas.canvas.height / 2 / ds.scale - centerY];
            app.canvas.setDirty?.(true, true);
        }));
    }
}
function presetsView() {
    body.append(el("h2", "", "Your presets"), el("p", "doss-muted", "Save widget settings from one selected Doss node. Presets are stored with your ComfyUI user, separately from the suite."));
    const name = el("input", "doss-input");
    name.placeholder = "Preset name";
    name.maxLength = 128;
    name.setAttribute("aria-label", "Preset name");
    body.append(name, button("Save selected node as preset", async () => {
        const node = selectedNode(), title = name.value.trim();
        if (!title)
            throw new Error("Enter a preset name first.");
        const values = captureValues(node.widgets || []);
        if (!Object.keys(values).length)
            throw new Error("This node has no scalar widget settings to save.");
        preferences.presets.push({ id: crypto.randomUUID(), name: title, node_id: node.comfyClass || node.type, values });
        await savePreferences();
        renderBody();
        message("Preset saved.");
    }, "doss-primary"));
    for (const preset of preferences.presets.filter(item => `${item.name} ${item.node_id}`.toLowerCase().includes(query.toLowerCase()))) {
        const card = el("article", "doss-card");
        card.append(el("h3", "", preset.name), el("p", "doss-muted", catalog.nodes.find(n => n.id === preset.node_id)?.name || preset.node_id));
        card.append(button("Add with preset", () => addNode(preset.node_id, preset.values)), button("Apply to selected", () => {
            const node = selectedNode();
            if ((node.comfyClass || node.type) !== preset.node_id)
                throw new Error("Select a node of the same type as this preset.");
            let missing = [];
            transaction(app.graph, () => { missing = applyValues(node, preset.values); });
            message(missing.length ? `Applied with unavailable fields: ${missing.join(", ")}` : "Preset applied. Ctrl/Cmd+Z undoes the change.");
        }), button("Remove preset", async () => {
            preferences.presets = preferences.presets.filter(item => item.id !== preset.id);
            await savePreferences();
            renderBody();
            message("Preset removed; existing nodes are unchanged.");
        }));
        body.append(card);
    }
}
async function diagnosticsView() {
    const holder = el("div");
    body.append(holder);
    holder.append(el("h2", "", "Installation health"), el("p", "doss-muted", "Check available tools and dependencies. This panel never changes your installation."));
    const data = await request("/doss/hub/status");
    if (!holder.isConnected)
        return;
    for (const [name, info] of Object.entries(data.dependencies))
        holder.append(el("p", "doss-health", `${info.available ? "✓" : "!"} ${name} · ${info.version || "Missing — reinstall the declared dependencies"}`));
    holder.append(el("p", "doss-muted", `${Object.keys(objectInfo).filter(id => id.startsWith("Doss")).length} backend Doss nodes loaded. Frontend-only tools are listed separately.`));
    const models = el("div");
    holder.append(button("Refresh installed model inventory", async () => {
        const inventory = await request("/doss/hub/models");
        models.replaceChildren();
        for (const [category, files] of Object.entries(inventory.models)) {
            const section = el("details", "doss-category");
            section.append(el("summary", "", `${category} · ${files.length}`), el("pre", "doss-report", files.length ? files.join("\n") : "No installed models in this category."));
            models.append(section);
        }
        message(`${inventory.count} installed model files found. No weights were loaded.`);
    }), models);
}
function aboutView() {
    body.append(el("h2", "", "Doss Node Suite"), el("p", "", "Practical tools for preparing, building, reviewing, and delivering creative work in ComfyUI."), el("p", "doss-muted", `Version ${catalog.version} · Free and open source · MIT license`));
    const links = el("div", "doss-about-links");
    for (const [label, url] of Object.entries(catalog.links)) {
        const link = el("a", "doss-button", label);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
    }
    body.append(links, el("p", "doss-muted", "Model weights are supplied by the user. Compatibility, model terms, and hardware requirements are described on the linked model pages. Doss tools run locally and do not install software during a workflow."));
}
function renderBody() {
    if (!body || !catalog)
        return;
    body.replaceChildren();
    for (const tab of root?.querySelectorAll(".doss-tab") || [])
        tab.setAttribute("aria-selected", String(tab.textContent === activeTab));
    if (activeTab === "Tools")
        toolsView();
    else if (activeTab === "Workflows")
        workflowsView();
    else if (activeTab === "Presets")
        presetsView();
    else if (activeTab === "Inspect")
        void diagnosticsView().catch(showError);
    else
        aboutView();
}
async function render(container) {
    root = el("div", "doss-hub");
    container.replaceChildren(root);
    const header = el("header", "doss-header");
    const brand = el("div");
    brand.append(el("div", "doss-eyebrow", "YOUR CREATIVE TOOLKIT"), el("h1", "", "Doss Hub"));
    header.append(brand, el("span", "doss-version", "0.7"));
    const search = el("input", "doss-input doss-search");
    search.type = "search";
    search.placeholder = "Find a tool or a task…";
    search.setAttribute("aria-label", "Search Doss tools");
    search.value = query;
    search.oninput = () => { query = search.value; renderBody(); };
    const favorite = button("★ Favorites", () => { favoritesOnly = !favoritesOnly; activeTab = "Tools"; favorite.setAttribute("aria-pressed", String(favoritesOnly)); renderBody(); }, "doss-favorites-filter");
    favorite.setAttribute("aria-pressed", String(favoritesOnly));
    const tabs = el("nav", "doss-tabs");
    tabs.setAttribute("aria-label", "Doss Hub sections");
    tabs.setAttribute("role", "tablist");
    for (const label of ["Tools", "Workflows", "Presets", "Inspect", "About"]) {
        const tab = button(label, () => { activeTab = label; renderBody(); }, "doss-tab");
        tab.setAttribute("role", "tab");
        tab.onkeydown = (event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                return;
            event.preventDefault();
            const all = [...tabs.querySelectorAll("button")];
            const next = (all.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
            all[next].focus();
            all[next].click();
        };
        tabs.append(tab);
    }
    statusLine = el("p", "doss-status", "Loading your tools…");
    statusLine.setAttribute("role", "status");
    statusLine.setAttribute("aria-live", "polite");
    body = el("div", "doss-body");
    body.setAttribute("role", "tabpanel");
    root.append(header, search, favorite, tabs, statusLine, body);
    try {
        const [data, info, prefs] = await Promise.all([request("/doss/hub/catalog"), request("/object_info"), request("/doss/hub/preferences")]);
        catalog = data;
        objectInfo = info;
        preferences = prefs;
        if (catalog.schema_version !== 1 || preferences.schema_version !== 1)
            throw new Error("Unsupported Doss data version. Update the suite and refresh.");
        message(`${catalog.nodes.length} tools · Ready`);
        renderBody();
    }
    catch (error) {
        showError(error);
        body.append(button("Retry", () => render(container)));
    }
}
app.registerExtension({
    name: "Doss.Hub",
    setup() {
        if (!app.extensionManager?.registerSidebarTab) {
            console.warn("Doss Hub requires ComfyUI's sidebar extension API. Backend nodes remain available.");
            return;
        }
        const style = el("link");
        style.rel = "stylesheet";
        style.href = new URL("./doss_hub.css", import.meta.url).href;
        document.head.append(style);
        app.extensionManager.registerSidebarTab({ id: "doss-hub", icon: "pi pi-th-large", title: "Doss Hub", tooltip: "Doss tools, presets, examples, and diagnostics", type: "custom", render: (container) => { void render(container); } });
    }
});
