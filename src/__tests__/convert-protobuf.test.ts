import * as fs from "node:fs";
import * as path from "node:path";
import { evalModuleDef } from "../modules/module-system";

const code = fs.readFileSync(
  path.resolve(__dirname, "../modules/convert-protobuf.js"),
  "utf8"
);

describe("convert-protobuf.js", () => {
  it("is a valid JS module object with the correct name", () => {
    const def = evalModuleDef(code);
    expect(def.name).toBe("Protobuf Converter");
  });
});
