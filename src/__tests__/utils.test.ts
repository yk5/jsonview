import { escapeHtml, dataPathToSchemaPath, typeClass, valueClass } from "../utils";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });
  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });
  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("dataPathToSchemaPath", () => {
  it("replaces numeric indices with []", () => {
    expect(dataPathToSchemaPath("$.items[0].name")).toBe("$.items[].name");
  });
  it("replaces multiple indices", () => {
    expect(dataPathToSchemaPath("$[0][1][2]")).toBe("$[][][]");
  });
  it("leaves non-index paths unchanged", () => {
    expect(dataPathToSchemaPath("$.foo.bar")).toBe("$.foo.bar");
  });
});

describe("typeClass", () => {
  it("returns correct class for each type", () => {
    expect(typeClass("string")).toBe("t-string");
    expect(typeClass("number")).toBe("t-number");
    expect(typeClass("boolean")).toBe("t-boolean");
    expect(typeClass("null")).toBe("t-null");
    expect(typeClass("object")).toBe("t-object");
    expect(typeClass("array")).toBe("t-array");
  });
});

describe("valueClass", () => {
  it("returns correct class for primitive types", () => {
    expect(valueClass("string")).toBe("v-string");
    expect(valueClass("number")).toBe("v-number");
    expect(valueClass("boolean")).toBe("v-boolean");
    expect(valueClass("null")).toBe("v-null");
  });
  it("returns empty string for container types", () => {
    expect(valueClass("object")).toBe("");
    expect(valueClass("array")).toBe("");
  });
});
