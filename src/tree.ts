import type { SchemaNode, TreeNode } from "./types.js";
import { escapeHtml, dataPathToSchemaPath, typeClass, valueClass } from "./utils.js";

// ── Fold / expand ─────────────────────────────────────

export function toggleNode(toggle: HTMLElement, children: HTMLElement): void {
  const folded = !children.classList.contains("hidden");
  children.classList.toggle("hidden", folded);
  toggle.classList.toggle("folded", folded);
}

export function setAllExpanded(
  nodes: Map<string, TreeNode>,
  expanded: boolean,
  setActiveLevels: (v: null) => void,
): void {
  setActiveLevels(null);
  nodes.forEach((n) => {
    n.el.classList.remove("dimmed");
    const wrapper = n.el.parentElement;
    if (wrapper?.classList.contains("node")) wrapper.style.display = "";
    if (n.childrenEl) {
      n.childrenEl.classList.toggle("hidden", !expanded);
      n.el.querySelector(".toggle")?.classList.toggle("folded", !expanded);
    }
  });
}

export function isAncestorPath(parent: string, child: string): boolean {
  if (!child.startsWith(parent) || child === parent) return false;
  const next = child[parent.length];
  return next === "." || next === "[";
}

// ── Resizer ───────────────────────────────────────────

export function initResizer(): void {
  const resizer = document.getElementById("resizer") as HTMLElement;
  const schemaPanel = document.getElementById("schemaPanel") as HTMLElement;
  let startX: number;
  let startW: number;

  resizer.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startW = schemaPanel.getBoundingClientRect().width;
    resizer.classList.add("active");

    const onMove = (e: MouseEvent) => {
      schemaPanel.style.flex = "none";
      schemaPanel.style.width = Math.max(200, startW + (e.clientX - startX)) + "px";
    };
    const onUp = () => {
      resizer.classList.remove("active");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

// ── Tree rendering ────────────────────────────────────

export function renderSchemaTree(
  container: HTMLElement,
  schema: SchemaNode,
  schemaNodes: Map<string, TreeNode>,
  key?: string,
): void {
  const isContainer = schema.type === "object" || schema.type === "array";
  const div = document.createElement("div");
  div.className = "node";

  const row = document.createElement("div");
  row.className = "node-row";
  row.style.setProperty("--depth", String(schema.depth));
  row.dataset["schemaPath"] = schema.path;
  row.dataset["container"] = isContainer ? "1" : "0";

  const toggleSpan = document.createElement("span");
  toggleSpan.className = "toggle" + (isContainer ? "" : " leaf");
  toggleSpan.textContent = "▼";

  let label = "";
  if (key !== undefined) label += `<span class="key">${escapeHtml(key)}</span><span class="colon">:</span>`;
  label += `<span class="type-tag ${typeClass(schema.type)}">${schema.type}</span>`;

  row.appendChild(toggleSpan);
  row.insertAdjacentHTML("beforeend", label);
  div.appendChild(row);

  let childrenDiv: HTMLElement | null = null;
  if (isContainer) {
    childrenDiv = document.createElement("div");
    childrenDiv.className = "children";
    if (schema.children) {
      for (const [k, v] of Object.entries(schema.children)) {
        renderSchemaTree(childrenDiv, v, schemaNodes, k);
      }
    }
    if (schema.items) renderSchemaTree(childrenDiv, schema.items, schemaNodes, "[]");
    div.appendChild(childrenDiv);

    const cd = childrenDiv;
    row.addEventListener("click", (e) => {
      if (!e.ctrlKey && !e.metaKey) { e.stopPropagation(); toggleNode(toggleSpan, cd); }
    });
  }

  schemaNodes.set(schema.path, {
    el: row,
    childrenEl: childrenDiv,
    path: schema.path,
    depth: schema.depth,
    isContainer,
  });
  container.appendChild(div);
}

export function renderDataTree(
  container: HTMLElement,
  value: unknown,
  dataNodes: Map<string, TreeNode>,
  path = "$",
  depth = 0,
  key?: string,
): void {
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value as "string" | "number" | "boolean" | "object";
  const isContainer = type === "object" || type === "array";
  const div = document.createElement("div");
  div.className = "node";

  const row = document.createElement("div");
  row.className = "node-row";
  row.style.setProperty("--depth", String(depth));
  const schemaPath = dataPathToSchemaPath(path);
  row.dataset["path"] = path;
  row.dataset["schemaPath"] = schemaPath;
  row.dataset["container"] = isContainer ? "1" : "0";

  const toggleSpan = document.createElement("span");
  toggleSpan.className = "toggle" + (isContainer ? "" : " leaf");
  toggleSpan.textContent = "▼";

  let label = "";
  if (key !== undefined) label += `<span class="key">${escapeHtml(key)}</span><span class="colon">:</span>`;

  if (isContainer) {
    const arrValue = value as unknown[];
    const objValue = value as Record<string, unknown>;
    const count = type === "array" ? arrValue.length : Object.keys(objValue).length;
    const open = type === "array" ? "[" : "{";
    const unit = type === "array" ? "items" : "keys";
    label += `<span class="bracket">${open}</span><span class="count">${count} ${unit}</span>`;
  } else {
    const display = type === "string" ? `"${escapeHtml(String(value))}"` : String(value);
    label += `<span class="value ${valueClass(type as "string" | "number" | "boolean" | "null")}">${display}</span>`;
  }

  row.appendChild(toggleSpan);
  row.insertAdjacentHTML("beforeend", label);
  div.appendChild(row);

  let childrenDiv: HTMLElement | null = null;
  if (isContainer) {
    childrenDiv = document.createElement("div");
    childrenDiv.className = "children";
    if (type === "array") {
      (value as unknown[]).forEach((item, i) => {
        renderDataTree(childrenDiv!, item, dataNodes, `${path}[${i}]`, depth + 1, String(i));
      });
    } else {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        renderDataTree(childrenDiv, v, dataNodes, `${path}.${k}`, depth + 1, k);
      }
    }
    div.appendChild(childrenDiv);

    const cd = childrenDiv;
    row.addEventListener("click", (e) => {
      if (!e.ctrlKey && !e.metaKey) { e.stopPropagation(); toggleNode(toggleSpan, cd); }
    });
  }

  dataNodes.set(path, { el: row, childrenEl: childrenDiv, path, depth, isContainer });
  container.appendChild(div);
}
