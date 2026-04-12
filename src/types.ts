// ── Schema node ───────────────────────────────────────
export type JsonType = "string" | "number" | "boolean" | "null" | "object" | "array";

export interface SchemaNode {
  type: JsonType;
  path: string;
  depth: number;
  children?: Record<string, SchemaNode>;
  items?: SchemaNode;
}

// ── Tree node (DOM reference stored in Map) ───────────
export interface TreeNode {
  el: HTMLElement;
  childrenEl: HTMLElement | null;
  path: string;
  depth: number;
  isContainer: boolean;
}

// ── Module definition (the object returned by eval) ───
export interface ModuleDef {
  name: string;
  description?: string;
  functions?: Record<string, (this: ModuleShared, ...args: unknown[]) => unknown>;
  styles?: string;
  buttons?: Record<string, string>;
  init?: (schemaDom: HTMLElement, dataDom: HTMLElement, shared: ModuleShared) => void;
  destroy?: () => void;
  // Allow arbitrary extra properties used internally by module instances
  [key: string]: unknown;
}

// ── Module registry entry ─────────────────────────────
export interface ModuleEntry {
  id: string;
  def: ModuleDef;
  codeStr: string;
  enabled: boolean;
}

// ── Shared context passed to modules ──────────────────
export interface ModuleShared {
  readonly schemaNodes: Map<string, TreeNode>;
  readonly dataNodes: Map<string, TreeNode>;
  activeLevels: Set<number> | null;
  setAllExpanded: (nodes: Map<string, TreeNode>, expanded: boolean) => void;
  dataPathToSchemaPath: (path: string) => string;
  isAncestorPath: (parent: string, child: string) => boolean;
  postLoad: Array<() => void>;
  // Module functions are attached dynamically
  [key: string]: unknown;
}
