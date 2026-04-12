import { parseLevels } from "../modules/show-levels";

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
