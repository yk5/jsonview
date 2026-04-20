import * as fs from "node:fs";
import * as path from "node:path";
import { evalModuleDef } from "../modules/module-system";

const code = fs.readFileSync(
  path.resolve(__dirname, "../modules/show-levels.js"),
  "utf8"
);

const def = evalModuleDef(code);
const parseLevels = def.functions!.parseLevels as (input: string) => Set<number>;

describe("show-levels.js", () => {
  it("is a valid JS module object with the correct name", () => {
    expect(def.name).toBe("Show Levels");
  });
});

describe("parseLevels", () => {
  it("parses a single level", () => {
    expect(parseLevels("2")).toEqual(new Set([2]));
  });

  it("parses a range", () => {
    expect(parseLevels("0-3")).toEqual(new Set([0, 1, 2, 3]));
  });

  it("parses a comma-separated list", () => {
    expect(parseLevels("0,2,4")).toEqual(new Set([0, 2, 4]));
  });

  it("parses mixed ranges and singles", () => {
    expect(parseLevels("0-2,4")).toEqual(new Set([0, 1, 2, 4]));
  });

  it("ignores empty parts", () => {
    expect(parseLevels(",, ,")).toEqual(new Set());
  });

  it("ignores invalid entries", () => {
    expect(parseLevels("abc")).toEqual(new Set());
  });

  it("returns empty set for empty string", () => {
    expect(parseLevels("")).toEqual(new Set());
  });

  it("handles whitespace around values", () => {
    expect(parseLevels(" 1 - 3 ")).toEqual(new Set([1, 2, 3]));
  });
});
