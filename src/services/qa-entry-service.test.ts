import { describe, expect, it } from "vitest";
import { InMemoryQaEntryRepository } from "@/test/in-memory-qa-entry-repository";
import {
  MAX_ANSWER_LENGTH,
  MAX_QA_PAIRS,
  MAX_QUESTION_LENGTH,
  saveQaPairs,
  validateQaPairs,
  type QaPairInput,
  type ValidQaPair,
} from "./qa-entry-service";

const target = { eventId: "evt-1", sectionId: "sec-1" };
const pair = (question: string, answer = "", id = ""): QaPairInput => ({ id, question, answer });

function valid(pairs: QaPairInput[]): ValidQaPair[] {
  const result = validateQaPairs(pairs);
  if (!result.ok) throw new Error(result.errors.join(" | "));
  return result.pairs;
}

const stored = async (repo: InMemoryQaEntryRepository, sectionId = "sec-1") =>
  (await repo.listByEvent("evt-1"))
    .filter((e) => e.sectionId === sectionId)
    .sort((a, b) => a.position - b.position);

describe("validateQaPairs", () => {
  it("accepts pairs and keeps their order and ids", () => {
    const pairs = valid([pair("First?", "One.", "id-1"), pair("Second?", "Two.")]);
    expect(pairs.map((p) => [p.id, p.question])).toEqual([["id-1", "First?"], [undefined, "Second?"]]);
  });

  it("ignores a pair with both boxes empty (the spare one the form always offers)", () => {
    expect(valid([pair("Q?", "A."), pair("", ""), pair("  ", "\n ")])).toHaveLength(1);
    expect(valid([])).toEqual([]);
  });

  it("trims and collapses whitespace in the question, and stores the answer as clean HTML", () => {
    const [p] = valid([pair("  Is   there\n parking?  ", "  Yes.\n\nSee the map.  ")]);
    expect(p.question).toBe("Is there parking?");
    expect(p.answer).toBe("<p>Yes.</p>\n\n<p>See the map.</p>");
  });

  it("allows a question with no answer", () => {
    expect(valid([pair("Only a question?")])[0].answer).toBe("");
  });

  it("accepts formatting and safe links in an answer", () => {
    const answer =
      'Get the <b>app</b> for <a href="https://play.google.com/store/x">Android</a>. Email <a href="mailto:opticon@kcimanagement.com">opticon@kcimanagement.com</a>.';
    expect(valid([pair("App?", answer)])[0].answer).toBe(
      '<p>Get the <strong>app</strong> for <a href="https://play.google.com/store/x">Android</a>. Email <a href="mailto:opticon@kcimanagement.com">opticon@kcimanagement.com</a>.</p>',
    );
  });

  it.each([
    ["an answer with no question", pair("", "An answer."), "Question 1: Question is required"],
    ["a too-long question", pair("q".repeat(MAX_QUESTION_LENGTH + 1), "A."), "Question 1: Question is too long"],
    ["a too-long answer", pair("Q?", "a".repeat(MAX_ANSWER_LENGTH + 1)), "Question 1: Text is too long"],
    ["an http link", pair("Q?", '<a href="http://example.com">a</a>'), "Question 1: Links must start with https://"],
    ["a javascript link", pair("Q?", '<a href="javascript:alert(1)">a</a>'), "Question 1: Links must start with"],
    ["an email link with a subject", pair("Q?", '<a href="mailto:x@example.com?subject=hi">a</a>'), "subject is filled in automatically"],
    ["a look-alike link text", pair("Q?", '<a href="https://evil.example.com">paypal.com</a>'), "looks like a different address"],
    ["a script tag", pair("Q?", "<script>alert(1)</script>"), "<script> isn't allowed"],
    ["an image", pair("Q?", '<img src="https://example.com/x.png">'), "<img> isn't allowed"],
    ["a div", pair("Q?", "<div>x</div>"), "<div> isn't allowed"],
  ])("rejects %s", (_name, input, message) => {
    const result = validateQaPairs([input]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.join(" ")).toContain(message);
  });

  it("names the pair by its number in the form, counting spare empty ones", () => {
    const result = validateQaPairs([pair("Fine?", "ok"), pair("", ""), pair("", "orphan answer")]);
    expect(!result.ok && result.errors).toEqual(["Question 3: Question is required"]);
  });

  it("reports problems in several pairs, and stores nothing if any pair is bad", () => {
    const result = validateQaPairs([pair("", "a"), pair("Fine?", "ok"), pair("Q?", "<div>x</div>")]);
    expect(!result.ok && result.errors).toHaveLength(2);
  });

  it("limits how many pairs a page can have", () => {
    const many = Array.from({ length: MAX_QA_PAIRS + 1 }, (_, i) => pair(`Q${i}?`));
    expect(validateQaPairs(many).ok).toBe(false);
    expect(validateQaPairs(many.slice(0, MAX_QA_PAIRS)).ok).toBe(true);
  });
});

describe("saveQaPairs", () => {
  it("creates new pairs in order", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("One?", "1"), pair("Two?", "2"), pair("Three?", "3")]));
    expect((await stored(repo)).map((e) => [e.question, e.position])).toEqual([["One?", 0], ["Two?", 1], ["Three?", 2]]);
  });

  it("updates pairs that have a known id, keeping their ids", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("Old?", "old")]));
    const [entry] = await stored(repo);

    await saveQaPairs(repo, target, valid([pair("New?", "new", entry.id)]));
    const after = await stored(repo);
    expect(after).toHaveLength(1);
    expect([after[0].id, after[0].question, after[0].answer]).toEqual([entry.id, "New?", "<p>new</p>"]);
  });

  it("deletes pairs that were removed from the form", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("Keep?"), pair("Drop?")]));
    const [keep] = await stored(repo);
    await saveQaPairs(repo, target, valid([pair("Keep?", "", keep.id)]));
    expect((await stored(repo)).map((e) => e.question)).toEqual(["Keep?"]);
  });

  it("removes every pair when the form is submitted with none", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("A?"), pair("B?")]));
    await saveQaPairs(repo, target, []);
    expect(await stored(repo)).toHaveLength(0);
  });

  it("applies the order from the form, including a reorder of existing pairs", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("A?"), pair("B?"), pair("C?")]));
    const [a, b, c] = await stored(repo);

    await saveQaPairs(repo, target, valid([pair("C?", "", c.id), pair("A?", "", a.id), pair("B?", "", b.id)]));
    const after = await stored(repo);
    expect(after.map((e) => e.question)).toEqual(["C?", "A?", "B?"]);
    expect(after.map((e) => e.position)).toEqual([0, 1, 2]);
    expect(after.map((e) => e.id)).toEqual([c.id, a.id, b.id]);
  });

  it("does a mix of update, create, delete and reorder in one save", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("A?"), pair("B?"), pair("C?")]));
    const [a, , c] = await stored(repo);

    await saveQaPairs(repo, target, valid([pair("New first?"), pair("C changed?", "x", c.id), pair("A?", "", a.id)]));
    expect((await stored(repo)).map((e) => e.question)).toEqual(["New first?", "C changed?", "A?"]);
  });

  it("only touches its own section", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("Mine?")]));
    const other = { eventId: "evt-1", sectionId: "sec-2" };
    await saveQaPairs(repo, other, valid([pair("Theirs?")]));

    await saveQaPairs(repo, target, []);
    expect(await stored(repo, "sec-1")).toHaveLength(0);
    expect((await stored(repo, "sec-2")).map((e) => e.question)).toEqual(["Theirs?"]);
  });

  it("treats an id from another section as a new pair instead of editing that entry", async () => {
    const repo = new InMemoryQaEntryRepository();
    const other = { eventId: "evt-1", sectionId: "sec-2" };
    await saveQaPairs(repo, other, valid([pair("Theirs?", "secret")]));
    const [theirs] = await stored(repo, "sec-2");

    await saveQaPairs(repo, target, valid([pair("Injected?", "x", theirs.id)]));

    expect((await stored(repo, "sec-2")).map((e) => [e.id, e.question, e.answer])).toEqual([[theirs.id, "Theirs?", "<p>secret</p>"]]);
    expect((await stored(repo, "sec-1")).map((e) => e.question)).toEqual(["Injected?"]);
  });

  it("doesn't let one id be used for two pairs", async () => {
    const repo = new InMemoryQaEntryRepository();
    await saveQaPairs(repo, target, valid([pair("Original?")]));
    const [entry] = await stored(repo);
    await saveQaPairs(repo, target, valid([pair("First?", "", entry.id), pair("Second?", "", entry.id)]));
    expect((await stored(repo)).map((e) => e.question).sort()).toEqual(["First?", "Second?"]);
  });
});
