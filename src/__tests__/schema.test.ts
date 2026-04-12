import { inferSchema, mergeSchema } from "../schema";

describe("inferSchema", () => {
  it("infers null type", () => {
    expect(inferSchema(null)).toMatchObject({ type: "null", path: "$", depth: 0 });
  });

  it("infers string type", () => {
    expect(inferSchema("hello")).toMatchObject({ type: "string" });
  });

  it("infers number type", () => {
    expect(inferSchema(42)).toMatchObject({ type: "number" });
  });

  it("infers boolean type", () => {
    expect(inferSchema(true)).toMatchObject({ type: "boolean" });
  });

  it("infers object type with children", () => {
    const schema = inferSchema({ name: "Alice", age: 30 });
    expect(schema.type).toBe("object");
    expect(schema.children?.["name"]).toMatchObject({ type: "string", path: "$.name", depth: 1 });
    expect(schema.children?.["age"]).toMatchObject({ type: "number", path: "$.age", depth: 1 });
  });

  it("infers array type with items", () => {
    const schema = inferSchema([1, 2, 3]);
    expect(schema.type).toBe("array");
    expect(schema.items).toMatchObject({ type: "number", path: "$[]", depth: 1 });
  });

  it("handles empty array", () => {
    const schema = inferSchema([]);
    expect(schema.type).toBe("array");
    expect(schema.items).toBeUndefined();
  });

  it("uses custom path and depth", () => {
    const schema = inferSchema("x", "$.foo", 2);
    expect(schema).toMatchObject({ type: "string", path: "$.foo", depth: 2 });
  });

  it("limits array sampling to 20 items", () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    // Should not throw and should produce a valid schema
    const schema = inferSchema(arr);
    expect(schema.type).toBe("array");
    expect(schema.items?.type).toBe("number");
  });
});

describe("mergeSchema", () => {
  it("merges object children from source into target", () => {
    const target = inferSchema({ a: 1 });
    const source = inferSchema({ b: "hello" });
    mergeSchema(target, source);
    expect(target.children?.["a"]).toBeDefined();
    expect(target.children?.["b"]).toBeDefined();
  });

  it("does not merge mismatched types", () => {
    const target = inferSchema({ a: 1 });
    const source = inferSchema([1, 2]);
    const originalChildren = { ...target.children };
    mergeSchema(target, source);
    expect(target.children).toEqual(originalChildren);
  });

  it("merges array items recursively", () => {
    const target = inferSchema([{ a: 1 }]);
    const source = inferSchema([{ b: 2 }]);
    mergeSchema(target, source);
    expect(target.items?.children?.["a"]).toBeDefined();
    expect(target.items?.children?.["b"]).toBeDefined();
  });
});
