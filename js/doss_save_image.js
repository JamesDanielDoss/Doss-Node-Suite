import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "DossSaveImage";
const WARNING_TEXT = 'Bad filename due to special characters. Characters have been changed to underscores "_".';

function findWidget(node, name) {
  return node.widgets?.find((widget) => widget.name === name);
}

function showMessage(message) {
  try {
    app.extensionManager?.toast?.add?.({
      severity: "warn",
      summary: "Doss Save Image",
      detail: message,
      life: 6000,
    });
    if (app.extensionManager?.toast?.add) {
      return;
    }
  } catch (_) {
    // Fall through to alert.
  }
  window.alert(message);
}

async function fetchFolders(path = "") {
  const params = new URLSearchParams({ path });
  const response = await fetch(api.apiURL(`/doss/save_image/folders?${params.toString()}`));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Could not list folders.");
  }
  return data;
}

async function createFolder(path, name) {
  const response = await fetch(api.apiURL("/doss/save_image/folders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Could not create folder.");
  }
  return data;
}

function makeButton(label) {
  const button = document.createElement("button");
  button.textContent = label;
  button.style.border = "1px solid var(--border-color, #555)";
  button.style.background = "var(--comfy-input-bg, #222)";
  button.style.color = "var(--fg-color, #ddd)";
  button.style.borderRadius = "4px";
  button.style.padding = "6px 10px";
  button.style.cursor = "pointer";
  return button;
}

function makeModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "10000";
  overlay.style.background = "rgba(0, 0, 0, 0.55)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const panel = document.createElement("div");
  panel.style.width = "min(560px, calc(100vw - 32px))";
  panel.style.maxHeight = "min(680px, calc(100vh - 32px))";
  panel.style.background = "var(--comfy-menu-bg, #1f1f1f)";
  panel.style.color = "var(--fg-color, #ddd)";
  panel.style.border = "1px solid var(--border-color, #555)";
  panel.style.borderRadius = "8px";
  panel.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.45)";
  panel.style.padding = "14px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "10px";
  overlay.appendChild(panel);

  return { overlay, panel };
}

async function openFolderBrowser(node) {
  const saveLocation = findWidget(node, "save_location");
  if (!saveLocation) {
    showMessage("Doss Save Image could not find the save_location widget.");
    return;
  }

  const { overlay, panel } = makeModal();
  function pathFromWidget(value) {
    const text = String(value || "").trim().replaceAll("\\", "/");
    return text.replace(/^\/+|\/+$/g, "").toLowerCase() === "output" ? "" : text;
  }

  function pathToWidget(path) {
    return path ? path : "output";
  }

  let currentPath = pathFromWidget(saveLocation.value);

  const title = document.createElement("div");
  title.textContent = "Choose ComfyUI Output Folder";
  title.style.fontWeight = "600";
  title.style.fontSize = "15px";
  panel.appendChild(title);

  const pathLabel = document.createElement("div");
  pathLabel.style.fontSize = "12px";
  pathLabel.style.opacity = "0.8";
  panel.appendChild(pathLabel);

  const list = document.createElement("div");
  list.style.border = "1px solid var(--border-color, #444)";
  list.style.borderRadius = "6px";
  list.style.minHeight = "220px";
  list.style.maxHeight = "360px";
  list.style.overflow = "auto";
  list.style.padding = "6px";
  panel.appendChild(list);

  const newFolderRow = document.createElement("div");
  newFolderRow.style.display = "flex";
  newFolderRow.style.gap = "8px";
  const newFolderInput = document.createElement("input");
  newFolderInput.placeholder = "New folder name";
  newFolderInput.style.flex = "1";
  newFolderInput.style.background = "var(--comfy-input-bg, #222)";
  newFolderInput.style.color = "var(--fg-color, #ddd)";
  newFolderInput.style.border = "1px solid var(--border-color, #555)";
  newFolderInput.style.borderRadius = "4px";
  newFolderInput.style.padding = "6px";
  const createButton = makeButton("Create");
  newFolderRow.appendChild(newFolderInput);
  newFolderRow.appendChild(createButton);
  panel.appendChild(newFolderRow);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "space-between";
  actions.style.gap = "8px";
  const leftActions = document.createElement("div");
  leftActions.style.display = "flex";
  leftActions.style.gap = "8px";
  const upButton = makeButton("Up");
  leftActions.appendChild(upButton);
  const rightActions = document.createElement("div");
  rightActions.style.display = "flex";
  rightActions.style.gap = "8px";
  const cancelButton = makeButton("Cancel");
  const selectButton = makeButton("Select");
  rightActions.appendChild(cancelButton);
  rightActions.appendChild(selectButton);
  actions.appendChild(leftActions);
  actions.appendChild(rightActions);
  panel.appendChild(actions);

  async function render(path) {
    list.textContent = "Loading...";
    const data = await fetchFolders(path);
    currentPath = data.current || "";
    pathLabel.textContent = currentPath ? `Output/${currentPath}` : "Output";
    upButton.disabled = !currentPath;
    list.innerHTML = "";
    if (!data.folders.length) {
      const empty = document.createElement("div");
      empty.textContent = "No subfolders.";
      empty.style.opacity = "0.7";
      empty.style.padding = "8px";
      list.appendChild(empty);
    }
    for (const folder of data.folders) {
      const row = document.createElement("button");
      row.textContent = folder.name;
      row.style.display = "block";
      row.style.width = "100%";
      row.style.textAlign = "left";
      row.style.margin = "0 0 4px";
      row.style.padding = "8px";
      row.style.border = "1px solid transparent";
      row.style.borderRadius = "4px";
      row.style.background = "transparent";
      row.style.color = "var(--fg-color, #ddd)";
      row.style.cursor = "pointer";
      row.onmouseenter = () => {
        row.style.background = "rgba(255,255,255,0.08)";
      };
      row.onmouseleave = () => {
        row.style.background = "transparent";
      };
      row.onclick = () => render(folder.path);
      list.appendChild(row);
    }
  }

  createButton.onclick = async () => {
    try {
      const name = newFolderInput.value.trim();
      if (!name) {
        return;
      }
      const created = await createFolder(currentPath, name);
      newFolderInput.value = "";
      await render(created.path);
    } catch (error) {
      showMessage(error.message);
    }
  };

  upButton.onclick = async () => {
    const data = await fetchFolders(currentPath);
    await render(data.parent || "");
  };
  cancelButton.onclick = () => overlay.remove();
  selectButton.onclick = () => {
    saveLocation.value = pathToWidget(currentPath);
    node.setDirtyCanvas?.(true, true);
    overlay.remove();
  };

  document.body.appendChild(overlay);
  try {
    await render(currentPath);
  } catch (error) {
    overlay.remove();
    showMessage(error.message);
  }
}

app.registerExtension({
  name: "doss.saveImage",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) {
      return;
    }

    const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
    const originalOnExecuted = nodeType.prototype.onExecuted;

    nodeType.prototype.onNodeCreated = function () {
      originalOnNodeCreated?.apply(this, arguments);
      try {
        this.addWidget("button", "Browse", "Browse", () => openFolderBrowser(this));
      } catch (error) {
        console.warn("[Doss Save Image] Browse setup failed.", error);
      }
    };

    nodeType.prototype.onExecuted = function (output) {
      originalOnExecuted?.apply(this, arguments);
      const warnings = output?.warnings || [];
      if (warnings.includes(WARNING_TEXT)) {
        showMessage(WARNING_TEXT);
      }
    };
  },
});
