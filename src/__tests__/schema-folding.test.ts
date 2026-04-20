import * as fs from "node:fs";
import * as path from "node:path";
import { evalModuleDef } from "../modules/module-system";

// fs.readFileSync mirrors what the esbuild ?raw plugin does at bundle time
const code = fs.readFileSync(
  path.resolve(__dirname, "../modules/schema-folding.js"),
  "utf8"
);

describe("schema-folding.js", () => {
  it("is a valid JS module object with the correct name", () => {
    const def = evalModuleDef(code);
    expect(def.name).toBe("Schema Folding");
  });
});
