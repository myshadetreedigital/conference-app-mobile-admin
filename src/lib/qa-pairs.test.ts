import { describe, expect, it } from "vitest";
import { moveItem, readQaPairs } from "./qa-pairs";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe("readQaPairs", () => {
  it("reads the pairs in page order, lining ids, questions and answers up by position", () => {
    const data = form([
      ["title", "FAQ"],
      ["qaId", "id-1"], ["qaQuestion", "First?"], ["qaAnswer", "One."],
      ["qaId", ""], ["qaQuestion", "Second?"], ["qaAnswer", "Two."],
    ]);
    expect(readQaPairs(data)).toEqual([
      { id: "id-1", question: "First?", answer: "One." },
      { id: "", question: "Second?", answer: "Two." },
    ]);
  });

  it("is empty when the form has no pairs", () => {
    expect(readQaPairs(form([["title", "x"]]))).toEqual([]);
  });

  it("copes with missing ids or answers", () => {
    expect(readQaPairs(form([["qaQuestion", "Only a question?"]]))).toEqual([
      { id: "", question: "Only a question?", answer: "" },
    ]);
  });

  it("ignores file inputs and other fields with the same names", () => {
    const data = new FormData();
    data.append("qaQuestion", new File(["x"], "x.txt"));
    expect(readQaPairs(data)).toHaveLength(1);
    expect(typeof readQaPairs(data)[0].question).toBe("string");
  });
});

describe("moveItem", () => {
  it("swaps an item with its neighbour", () => {
    expect(moveItem(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("changes nothing at the ends or for an index that isn't there", () => {
    expect(moveItem(["a", "b", "c"], 0, "up")).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, "down")).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], -1, "down")).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 9, "up")).toEqual(["a", "b", "c"]);
    expect(moveItem([], 0, "down")).toEqual([]);
  });

  it("returns a copy and never changes the original", () => {
    const original = ["a", "b"];
    const moved = moveItem(original, 0, "down");
    expect(original).toEqual(["a", "b"]);
    expect(moved).not.toBe(original);
  });
});
