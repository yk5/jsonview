import * as fs from "node:fs";
import * as path from "node:path";
import { evalModuleDef } from "../modules/module-system";

const code = fs.readFileSync(
  path.resolve(__dirname, "../modules/highlight.js"),
  "utf8"
);

describe("highlight.js", () => {
  it("is a valid JS module object with the correct name", () => {
    const def = evalModuleDef(code);
    expect(def.name).toBe("Highlight");
  });

  it("exports schemaHighlights and dataHighlights Sets in functions", () => {
    const def = evalModuleDef(code);
    expect(def.functions?.schemaHighlights).toBeInstanceOf(Set);
    expect(def.functions?.dataHighlights).toBeInstanceOf(Set);
  });

  it("has init and destroy methods", () => {
    const def = evalModuleDef(code);
    expect(typeof def.init).toBe("function");
    expect(typeof def.destroy).toBe("function");
  });
});
