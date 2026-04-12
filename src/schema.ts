import type { SchemaNode } from "./types.js";

export function inferSchema(value: unknown, path = "$", depth = 0): SchemaNode {
  if (value === null) return { type: "null", path, depth };

  if (Array.isArray(value)) {
    const node: SchemaNode = { type: "array", path, depth };
    if (value.length > 0) {
      node.items = inferSchema(value[0], path + "[]", depth + 1);
      for (let i = 1; i < Math.min(value.length, 20); i++) {
        mergeSchema(node.items, inferSchema(value[i], path + "[]", depth + 1));
      }
    }
    return node;
  }

  if (typeof value === "object") {
    const node: SchemaNode = { type: "object", path, depth, children: {} };
    for (const k of Object.keys(value as object)) {
      node.children![k] = inferSchema((value as Record<string, unknown>)[k], path + "." + k, depth + 1);
    }
    return node;
  }

  return { type: typeof value as SchemaNode["type"], path, depth };
}

export function mergeSchema(target: SchemaNode, source: SchemaNode): void {
  if (target.type !== source.type) return;

  if (source.children) {
    if (!target.children) target.children = {};
    for (const k of Object.keys(source.children)) {
      if (target.children[k]) mergeSchema(target.children[k], source.children[k]);
      else target.children[k] = source.children[k];
    }
  }

  if (source.items) {
    if (target.items) mergeSchema(target.items, source.items);
    else target.items = source.items;
  }
}
