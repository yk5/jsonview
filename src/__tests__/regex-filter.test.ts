import * as fs from "node:fs";
import * as path from "node:path";
import { evalModuleDef } from "../modules/module-system";

const code = fs.readFileSync(
  path.resolve(__dirname, "../modules/regex-filter.js"),
  "utf8"
);

describe("regex-filter.js", () => {
  it("is a valid JS module object with the correct name", () => {
    const def = evalModuleDef(code);
    expect(def.name).toBe("Regex Filter");
  });

  it("exports an applyFilter function", () => {
    const def = evalModuleDef(code);
    expect(typeof def.functions?.applyFilter).toBe("function");
  });

  it("has init and destroy methods", () => {
    const def = evalModuleDef(code);
    expect(typeof def.init).toBe("function");
    expect(typeof def.destroy).toBe("function");
  });
});
