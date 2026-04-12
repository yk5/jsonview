import type { JsonType } from "./types.js";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dataPathToSchemaPath(path: string): string {
  return path.replace(/\[\d+\]/g, "[]");
}

export function typeClass(t: JsonType): string {
  const map: Record<JsonType, string> = {
    string: "t-string",
    number: "t-number",
    boolean: "t-boolean",
    null: "t-null",
    object: "t-object",
    array: "t-array",
  };
  return map[t] ?? "";
}

export function valueClass(t: JsonType): string {
  const map: Partial<Record<JsonType, string>> = {
    string: "v-string",
    number: "v-number",
    boolean: "v-boolean",
    null: "v-null",
  };
  return map[t] ?? "";
}
