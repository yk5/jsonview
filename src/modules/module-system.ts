import type { ModuleDef, ModuleEntry, ModuleShared, TreeNode } from "../types.js";
import { dataPathToSchemaPath } from "../utils.js";
import { setAllExpanded, isAncestorPath } from "../tree.js";

// ── Module registry ───────────────────────────────────
export const modules = new Map<string, ModuleEntry>();

// ── Shared context ────────────────────────────────────
// Initialised once by main.ts, passing getters that close over the real Maps.
export let moduleShared: ModuleShared;

export interface ModuleSharedInit {
  getSchemaNodes:  () => Map<string, TreeNode>;
  getDataNodes:    () => Map<string, TreeNode>;
  getActiveLevels: () => Set<number> | null;
  setActiveLevels: (v: Set<number> | null) => void;
}

export function initModuleShared(opts: ModuleSharedInit): ModuleShared {
  moduleShared = {
    get schemaNodes() { return opts.getSchemaNodes(); },
    get dataNodes()   { return opts.getDataNodes(); },
    get activeLevels()          { return opts.getActiveLevels(); },
    set activeLevels(v)         { opts.setActiveLevels(v); },
    setAllExpanded: (nodes, expanded) =>
      setAllExpanded(nodes, expanded, (v) => opts.setActiveLevels(v)),
    dataPathToSchemaPath,
    isAncestorPath,
    postLoad: [],
  };
  return moduleShared;
}

// ── Button injection slots ────────────────────────────
const BUTTON_SLOTS: Record<string, () => HTMLElement | null> = {
  "toolbar":             () => document.querySelector("header .toolbar"),
  "schema.header.left":  () => document.querySelector("#schemaPanel .panel-header-left"),
  "schema.header.right": () => document.querySelector("#schemaPanel .panel-header-right"),
  "data.header.left":    () => document.querySelector("#dataPanel .panel-header-left"),
  "data.header.right":   () => document.querySelector("#dataPanel .panel-header-right"),
};

// ── Core module API ───────────────────────────────────
export function evalModuleDef(codeStr: string): ModuleDef {
  return (new Function("return (" + codeStr + ")"))() as ModuleDef;
}

function _registerFunctions(def: ModuleDef): void {
  if (!def.functions) return;
  for (const [name, fn] of Object.entries(def.functions)) {
    moduleShared[name] = typeof fn === "function" ? fn.bind(moduleShared) : fn;
  }
}

function _unregisterFunctions(def: ModuleDef): void {
  if (!def.functions) return;
  for (const name of Object.keys(def.functions)) {
    delete moduleShared[name];
  }
}

export function registerModule(codeStr: string): void {
  const def = evalModuleDef(codeStr);
  const id = def.name;
  _registerFunctions(def);
  modules.set(id, { id, def, codeStr, enabled: false });
  enableModule(id);
}

export function enableModule(id: string): void {
  const mod = modules.get(id);
  if (!mod || mod.enabled) return;

  if (mod.def.styles) {
    const el = document.createElement("style");
    el.id = "mod-style-" + id;
    el.textContent = mod.def.styles;
    document.head.appendChild(el);
  }

  if (mod.def.buttons) {
    for (const [slot, html] of Object.entries(mod.def.buttons)) {
      const parent = BUTTON_SLOTS[slot]?.();
      if (parent) {
        const wrapper = document.createElement("div");
        wrapper.id = "mod-slot-" + id + "-" + slot.replace(/\./g, "-");
        wrapper.className = "btn-group btn-group--tight";
        wrapper.innerHTML = html;
        parent.appendChild(wrapper);
        // Buttons start disabled; enableControls() in main.ts enables them after a JSON load.
      }
    }
  }

  const schemaDom = document.getElementById("schemaTree") as HTMLElement;
  const dataDom   = document.getElementById("dataTree") as HTMLElement;
  mod.def.init?.call(mod.def, schemaDom, dataDom, moduleShared);

  mod.enabled = true;
}

export function disableModule(id: string): void {
  const mod = modules.get(id);
  if (!mod || !mod.enabled) return;

  mod.def.destroy?.call(mod.def);

  if (mod.def.buttons) {
    for (const slot of Object.keys(mod.def.buttons)) {
      document.getElementById("mod-slot-" + id + "-" + slot.replace(/\./g, "-"))?.remove();
    }
  }

  document.getElementById("mod-style-" + id)?.remove();
  mod.enabled = false;
}

export function removeModule(id: string): void {
  disableModule(id);
  const mod = modules.get(id);
  if (mod) _unregisterFunctions(mod.def);
  modules.delete(id);
}

export function applyModuleCode(id: string, newCode: string): void {
  const mod = modules.get(id);
  if (!mod) return;
  const wasEnabled = mod.enabled;
  if (wasEnabled) disableModule(id);
  _unregisterFunctions(mod.def);
  mod.def = evalModuleDef(newCode);
  mod.codeStr = newCode;
  _registerFunctions(mod.def);
  if (wasEnabled) enableModule(id);
}
