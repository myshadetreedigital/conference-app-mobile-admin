import { describe, expect, it } from "vitest";
import {
  addPair,
  editPair,
  initialPairs,
  movePair,
  pairTitle,
  removePair,
  setAllOpen,
  togglePair,
  type PairState,
} from "./qa-pair-list";

const stored = (id: string, question = `Q ${id}`, answer = `A ${id}`) => ({ id, question, answer });
const keys = (pairs: PairState[]) => pairs.map((p) => p.key);

describe("initialPairs", () => {
  it("starts saved pairs collapsed, in order, keyed by their ids", () => {
    const pairs = initialPairs([stored("a"), stored("b")]);
    expect(pairs.map((p) => [p.key, p.id, p.open])).toEqual([["a", "a", false], ["b", "b", false]]);
    expect(pairs[0]).toMatchObject({ question: "Q a", answer: "A a" });
  });

  it("starts a page with no pairs with one blank open pair, so the boxes are there at once", () => {
    const pairs = initialPairs([]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ id: "", question: "", answer: "", open: true });
  });
});

describe("changing the list", () => {
  const base = () => initialPairs([stored("a"), stored("b"), stored("c")]);

  it("adds a blank open pair at the end, with no stored id", () => {
    const pairs = addPair(base());
    expect(keys(pairs)).toEqual(["a", "b", "c", "new-1"]);
    expect(pairs[3]).toMatchObject({ id: "", question: "", answer: "", open: true });
  });

  it("gives every added pair its own key, even after removals and moves", () => {
    let pairs = initialPairs([]);
    for (let i = 0; i < 5; i++) pairs = addPair(pairs);
    pairs = removePair(pairs, "new-2");
    pairs = movePair(pairs, "new-4", "up");
    pairs = addPair(pairs);
    pairs = addPair(pairs);
    expect(new Set(keys(pairs)).size).toBe(pairs.length);
  });

  it("removes a pair by key", () => {
    expect(keys(removePair(base(), "b"))).toEqual(["a", "c"]);
    expect(keys(removePair(base(), "nope"))).toEqual(["a", "b", "c"]);
  });

  it("can remove every pair", () => {
    expect(removePair(base(), "a").length).toBe(2);
    expect(["a", "b", "c"].reduce(removePair, base())).toEqual([]);
  });

  it("moves a pair up or down, and not past the ends", () => {
    expect(keys(movePair(base(), "b", "up"))).toEqual(["b", "a", "c"]);
    expect(keys(movePair(base(), "b", "down"))).toEqual(["a", "c", "b"]);
    expect(keys(movePair(base(), "a", "up"))).toEqual(["a", "b", "c"]);
    expect(keys(movePair(base(), "c", "down"))).toEqual(["a", "b", "c"]);
    expect(keys(movePair(base(), "zzz", "up"))).toEqual(["a", "b", "c"]);
  });

  it("keeps each pair's id and text when it moves", () => {
    const moved = movePair(base(), "c", "up");
    expect(moved[1]).toMatchObject({ id: "c", question: "Q c", answer: "A c" });
  });

  it("edits one pair's question or answer without touching the others", () => {
    const pairs = editPair(base(), "b", { question: "Changed?" });
    expect(pairs.map((p) => p.question)).toEqual(["Q a", "Changed?", "Q c"]);
    expect(pairs[1].answer).toBe("A b");
  });

  it("never changes the list it is given", () => {
    const original = base();
    const snapshot = JSON.stringify(original);
    addPair(original); removePair(original, "a"); movePair(original, "a", "down");
    togglePair(original, "a"); setAllOpen(original, true); editPair(original, "a", { question: "x" });
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe("collapsing", () => {
  const base = () => initialPairs([stored("a"), stored("b"), stored("c")]);

  it("toggles one pair open and closed", () => {
    const opened = togglePair(base(), "b");
    expect(opened.map((p) => p.open)).toEqual([false, true, false]);
    expect(togglePair(opened, "b").map((p) => p.open)).toEqual([false, false, false]);
  });

  it("opens or closes them all", () => {
    expect(setAllOpen(base(), true).every((p) => p.open)).toBe(true);
    expect(setAllOpen(setAllOpen(base(), true), false).every((p) => !p.open)).toBe(true);
  });

  it("collapsing keeps the typed text, so it is still submitted", () => {
    const typed = editPair(addPair([]), "new-1", { question: "Typed?", answer: "Typed answer" });
    const collapsed = togglePair(typed, "new-1");
    expect(collapsed[0]).toMatchObject({ open: false, question: "Typed?", answer: "Typed answer" });
  });
});

describe("pairTitle", () => {
  it("shows the question, tidied up", () => {
    expect(pairTitle({ question: "  Is   there\n parking?  " })).toBe("Is there parking?");
  });

  it("falls back to a placeholder for an empty question", () => {
    expect(pairTitle({ question: "" })).toBe("New question");
    expect(pairTitle({ question: "  \n " })).toBe("New question");
  });

  it("shortens a long question with an ellipsis, without splitting a character", () => {
    const title = pairTitle({ question: "é".repeat(200) }, 20);
    expect(Array.from(title)).toHaveLength(20);
    expect(title.endsWith("…")).toBe(true);
    expect(pairTitle({ question: "😀".repeat(200) }, 10)).not.toContain("�");
  });
});
