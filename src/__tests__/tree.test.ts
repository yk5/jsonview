/**
 * @jest-environment jsdom
 */
import { isAncestorPath, setAllExpanded } from "../tree";
import type { TreeNode } from "../types";

describe("isAncestorPath", () => {
  it("returns true for direct object child", () => {
    expect(isAncestorPath("$", "$.foo")).toBe(true);
  });

  it("returns true for nested child", () => {
    expect(isAncestorPath("$.foo", "$.foo.bar")).toBe(true);
  });

  it("returns true for array child", () => {
    expect(isAncestorPath("$", "$[0]")).toBe(true);
  });

  it("returns false for same path", () => {
    expect(isAncestorPath("$.foo", "$.foo")).toBe(false);
  });

  it("returns false for sibling path", () => {
    expect(isAncestorPath("$.foo", "$.fooBar")).toBe(false);
  });

  it("returns false for unrelated path", () => {
    expect(isAncestorPath("$.bar", "$.foo")).toBe(false);
  });

  it("returns false when child does not start with parent", () => {
    expect(isAncestorPath("$.xyz", "$.abc")).toBe(false);
  });
});

describe("setAllExpanded", () => {
  function makeNode(hasChildren: boolean): TreeNode {
    const el = document.createElement("div");
    el.className = "node-row dimmed";
    // Give it a parent with class 'node'
    const parent = document.createElement("div");
    parent.className = "node";
    parent.style.display = "none";
    parent.appendChild(el);

    const toggle = document.createElement("span");
    toggle.className = "toggle folded";
    el.appendChild(toggle);

    const childrenEl = hasChildren ? document.createElement("div") : null;
    if (childrenEl) childrenEl.className = "children hidden";

    return { el, childrenEl, path: "$", depth: 0, isContainer: hasChildren };
  }

  it("expands all nodes", () => {
    const node = makeNode(true);
    const nodes = new Map([["$", node]]);
    let activeLevels: Set<number> | null = new Set([0]);

    setAllExpanded(nodes, true, (v) => { activeLevels = v; });

    expect(activeLevels).toBeNull();
    expect(node.el.classList.contains("dimmed")).toBe(false);
    expect(node.childrenEl?.classList.contains("hidden")).toBe(false);
    expect(node.el.querySelector(".toggle")?.classList.contains("folded")).toBe(false);
  });

  it("collapses all nodes", () => {
    const node = makeNode(true);
    if (node.childrenEl) node.childrenEl.classList.remove("hidden");
    const nodes = new Map([["$", node]]);
    let activeLevels: Set<number> | null = null;

    setAllExpanded(nodes, false, (v) => { activeLevels = v; });

    expect(activeLevels).toBeNull();
    expect(node.childrenEl?.classList.contains("hidden")).toBe(true);
  });

  it("handles leaf nodes (no childrenEl)", () => {
    const node = makeNode(false);
    const nodes = new Map([["$", node]]);
    // Should not throw
    expect(() => setAllExpanded(nodes, true, () => {})).not.toThrow();
  });
});
