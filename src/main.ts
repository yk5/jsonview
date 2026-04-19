import { inferSchema } from "./schema.js";
import { renderSchemaTree, renderDataTree, setAllExpanded, initResizer } from "./tree.js";
import { escapeHtml } from "./utils.js";
import {
  modules,
  moduleShared,
  initModuleShared,
  evalModuleDef,
  registerModule,
  enableModule,
  disableModule,
  removeModule,
  applyModuleCode,
} from "./modules/module-system.js";
import SHOW_LEVELS_MODULE_CODE from "./modules/show-levels.js?raw";
import SCHEMA_FOLDING_CODE from "./modules/schema-folding.js?raw";
import CONVERT_PROTOBUF_CODE from "./modules/convert-protobuf.js?raw";
import BLANK_MODULE_CODE from "./modules/blank-template.js?raw";
import type { TreeNode } from "./types.js";

// ── State ─────────────────────────────────────────────
const schemaNodes = new Map<string, TreeNode>();
const dataNodes   = new Map<string, TreeNode>();
let activeLevels: Set<number> | null = null;
let currentJson: unknown = undefined;

// Wire moduleShared to the Maps that actually get populated
initModuleShared({
  getSchemaNodes:  () => schemaNodes,
  getDataNodes:    () => dataNodes,
  getActiveLevels: () => activeLevels,
  setActiveLevels: (v) => { activeLevels = v; },
});

function loadJson(json: unknown, schemaContainer: HTMLElement, dataContainer: HTMLElement): void {
  schemaNodes.clear();
  dataNodes.clear();
  activeLevels = null;
  schemaContainer.innerHTML = "";
  dataContainer.innerHTML   = "";
  moduleShared.postLoad.forEach((fn) => fn());
  renderSchemaTree(schemaContainer, inferSchema(json), schemaNodes);
  renderDataTree(dataContainer, json, dataNodes);
}

// Wires line-number gutter, Tab insertion, scroll sync, and Ctrl/Cmd+Enter apply
// onto a textarea. Returns the refresh function to call after external value changes.
function attachCodeEditor(
  area: HTMLTextAreaElement,
  lines: HTMLElement,
  onApply: () => void,
): () => void {
  const update = (): void => {
    const count = area.value.split("\n").length;
    lines.innerHTML = Array.from({ length: count }, (_, i) => `<div>${i + 1}</div>`).join("");
  };
  area.addEventListener("input", update);
  area.addEventListener("scroll", () => { lines.scrollTop = area.scrollTop; });
  area.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = area.selectionStart;
      area.value = area.value.substring(0, s) + "  " + area.value.substring(area.selectionEnd);
      area.selectionStart = area.selectionEnd = s + 2;
      update();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onApply();
  });
  return update;
}

// ── Init ──────────────────────────────────────────────
function init(): void {
  const fileInput   = document.getElementById("fileInput") as HTMLInputElement;
  const schemaTree  = document.getElementById("schemaTree") as HTMLElement;
  const dataTree    = document.getElementById("dataTree") as HTMLElement;

  const btnFold     = document.getElementById("btnFold") as HTMLButtonElement;
  const btnExpand   = document.getElementById("btnExpand") as HTMLButtonElement;

  const overlay     = document.getElementById("editorOverlay") as HTMLElement;
  const editorArea  = document.getElementById("editorArea") as HTMLTextAreaElement;
  const editorLines = document.getElementById("editorLines") as HTMLElement;
  const editorError = document.getElementById("editorError") as HTMLElement;
  const editorTitle = document.getElementById("editorTitle") as HTMLElement;
  const btnEdit     = document.getElementById("btnEdit") as HTMLButtonElement;
  const btnApply    = document.getElementById("btnApply") as HTMLButtonElement;
  const btnCancel   = document.getElementById("btnCancel") as HTMLButtonElement;
  const btnFormat   = document.getElementById("btnFormat") as HTMLButtonElement;

  initResizer();

  registerModule(SCHEMA_FOLDING_CODE, /*enabled=*/true);
  registerModule(SHOW_LEVELS_MODULE_CODE, /*enabled=*/false);
  registerModule(CONVERT_PROTOBUF_CODE, /*enabled=*/false);

  btnFold.addEventListener("click", () => {
    setAllExpanded(schemaNodes, false, (v) => { activeLevels = v; });
    setAllExpanded(dataNodes,   false, (v) => { activeLevels = v; });
  });
  btnExpand.addEventListener("click", () => {
    setAllExpanded(schemaNodes, true, (v) => { activeLevels = v; });
    setAllExpanded(dataNodes,   true, (v) => { activeLevels = v; });
  });

  // ── File loading ──
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        currentJson = json;
        loadJson(json, schemaTree, dataTree);
      } catch {
        schemaTree.innerHTML = '<div class="empty-state">Invalid JSON</div>';
        dataTree.innerHTML   = '<div class="empty-state">Invalid JSON</div>';
      }
    };
    reader.readAsText(file);
  });

  // ── Editor modal ──
  let editorMode: string | null = null; // null = JSON, string = module id

  const updateLineNumbers = attachCodeEditor(editorArea, editorLines, () => btnApply.click());

  function openEditor(mode: string | null): void {
    editorMode = mode;
    editorError.textContent = "";

    if (mode === null) {
      editorTitle.textContent = "Edit JSON";
      editorArea.value = currentJson !== undefined ? JSON.stringify(currentJson, null, 2) : "{\n  \n}";
    } else {
      const mod = modules.get(mode);
      editorTitle.textContent = "Module: " + (mod?.def.name || mode);
      editorArea.value = mod?.codeStr || "";
    }

    updateLineNumbers();
    overlay.classList.add("open");
    requestAnimationFrame(() => {
      editorArea.focus();
      if (mode === null && currentJson === undefined) {
        editorArea.selectionStart = editorArea.selectionEnd = 4;
      }
    });
  }

  function closeEditor(): void { overlay.classList.remove("open"); }

  btnEdit.addEventListener("click",   () => openEditor(null));
  btnCancel.addEventListener("click", closeEditor);
  overlay.addEventListener("click",   (e) => { if (e.target === overlay) closeEditor(); });

  btnFormat.addEventListener("click", () => {
    if (editorMode !== null) return;
    try {
      editorArea.value = JSON.stringify(JSON.parse(editorArea.value), null, 2);
      editorError.textContent = "";
      updateLineNumbers();
    } catch (err) {
      editorError.textContent = "⚠ " + (err as Error).message;
    }
  });

  btnApply.addEventListener("click", () => {
    if (editorMode !== null) {
      try {
        applyModuleCode(editorMode, editorArea.value);
        editorError.textContent = "";
        closeEditor();
      } catch (err) {
        editorError.textContent = "⚠ " + (err as Error).message;
      }
    } else {
      try {
        const json = JSON.parse(editorArea.value);
        currentJson = json;
        loadJson(json, schemaTree, dataTree);
        closeEditor();
      } catch (err) {
        editorError.textContent = "⚠ " + (err as Error).message;
      }
    }
  });

  // ── Modules popup ──
  const modulesOverlay  = document.getElementById("modulesOverlay") as HTMLElement;
  const modulesList     = document.getElementById("modulesList") as HTMLElement;
  const btnModules      = document.getElementById("btnModules") as HTMLButtonElement;
  const btnModulesClose = document.getElementById("btnModulesClose") as HTMLButtonElement;
  const btnAddModule    = document.getElementById("btnAddModule") as HTMLButtonElement;

  function buildModulesList(): void {
    modulesList.innerHTML = "";
    modules.forEach((mod, id) => {
      const item = document.createElement("div");
      item.className = "module-item";
      item.dataset["moduleId"] = id;

      item.innerHTML = `
        <div class="module-item-header">
          <div class="module-item-info">
            <span class="module-name">${escapeHtml(mod.def.name || id)}</span>
            <span class="module-desc">${escapeHtml(mod.def.description || "")}</span>
          </div>
          <div class="module-item-controls">
            <button class="btn-module-edit">Edit</button>
            <button class="btn-module-remove" title="Remove module">Remove</button>
            <label class="toggle-switch" title="${mod.enabled ? "Disable" : "Enable"} module">
              <input type="checkbox" ${mod.enabled ? "checked" : ""}>
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
            </label>
          </div>
        </div>
        <div class="module-editor hidden">
          <div class="module-editor-error"></div>
          <div class="editor-wrap">
            <div class="editor-lines"></div>
            <textarea class="editor-area" spellcheck="false"></textarea>
          </div>
          <div class="module-editor-actions">
            <button class="btn-module-apply">Apply</button>
            <button class="btn-module-discard">Discard</button>
          </div>
        </div>`;

      const toggle     = item.querySelector("input[type=checkbox]") as HTMLInputElement;
      const editBtn    = item.querySelector(".btn-module-edit") as HTMLButtonElement;
      const removeBtn  = item.querySelector(".btn-module-remove") as HTMLButtonElement;
      const editorDiv  = item.querySelector(".module-editor") as HTMLElement;
      const errDiv     = item.querySelector(".module-editor-error") as HTMLElement;
      const textarea   = item.querySelector("textarea") as HTMLTextAreaElement;
      const linesDiv   = item.querySelector(".editor-lines") as HTMLElement;
      const applyBtn   = item.querySelector(".btn-module-apply") as HTMLButtonElement;
      const discardBtn = item.querySelector(".btn-module-discard") as HTMLButtonElement;

      const updateLines = attachCodeEditor(textarea, linesDiv, () => applyBtn.click());

      toggle.addEventListener("change", () => {
        if (toggle.checked) enableModule(id);
        else disableModule(id);
        buildModulesList();
      });

      removeBtn.addEventListener("click", () => {
        if (!confirm(`Remove module "${mod.def.name || id}"?`)) return;
        removeModule(id);
        buildModulesList();
      });

      editBtn.addEventListener("click", () => {
        if (!editorDiv.classList.contains("hidden")) {
          editorDiv.classList.add("hidden");
          editBtn.textContent = "Edit";
          return;
        }
        textarea.value = modules.get(id)?.codeStr || "";
        updateLines();
        errDiv.textContent = "";
        editorDiv.classList.remove("hidden");
        editBtn.textContent = "Close";
        textarea.focus();
      });

      applyBtn.addEventListener("click", () => {
        try {
          applyModuleCode(id, textarea.value);
          errDiv.textContent = "";
          textarea.value = modules.get(id)?.codeStr || textarea.value;
          buildModulesList();
        } catch (err) {
          errDiv.textContent = "⚠ " + (err as Error).message;
        }
      });

      discardBtn.addEventListener("click", () => {
        textarea.value = modules.get(id)?.codeStr || "";
        updateLines();
        errDiv.textContent = "";
        editorDiv.classList.add("hidden");
        editBtn.textContent = "Edit";
      });

      modulesList.appendChild(item);
    });
  }

  btnModules.addEventListener("click", () => {
    buildModulesList();
    modulesOverlay.classList.add("open");
  });

  btnModulesClose.addEventListener("click", () => modulesOverlay.classList.remove("open"));
  modulesOverlay.addEventListener("click", (e) => {
    if (e.target === modulesOverlay) modulesOverlay.classList.remove("open");
  });

  btnAddModule.addEventListener("click", () => {
    const id = "Module_" + Date.now();
    const def = evalModuleDef(BLANK_MODULE_CODE);
    modules.set(id, { id, def, codeStr: BLANK_MODULE_CODE, enabled: false });
    buildModulesList();
    const newItem = modulesList.querySelector(`[data-module-id="${id}"]`);
    (newItem?.querySelector(".btn-module-edit") as HTMLButtonElement | null)?.click();
    newItem?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

init();
