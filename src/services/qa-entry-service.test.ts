import { describe, expect, it } from "vitest";
import { InMemoryQaEntryRepository } from "@/test/in-memory-qa-entry-repository";
import {
  createQaEntry,
  deleteQaEntry,
  MAX_ANSWER_LENGTH,
  MAX_QUESTION_LENGTH,
  movedIds,
  moveQaEntry,
  updateQaEntry,
} from "./qa-entry-service";

const target = { eventId: "evt-1", sectionId: "sec-1" };

async function seed(repo: InMemoryQaEntryRepository, questions: string[]) {
  const ids: string[] = [];
  for (const question of questions) {
    const result = await createQaEntry(repo, target, { question, answer: "" });
    if (result.status !== "created") throw new Error("setup failed");
    ids.push(result.entry.id);
  }
  return ids;
}

const order = async (repo: InMemoryQaEntryRepository) =>
  (await repo.listByEvent("evt-1")).sort((a, b) => a.position - b.position).map((e) => e.question);

describe("createQaEntry", () => {
  it("stores the pair in the given section and appends it in order", async () => {
    const repo = new InMemoryQaEntryRepository();
    await seed(repo, ["First?", "Second?", "Third?"]);
    const entries = await repo.listByEvent("evt-1");
    expect(entries.map((e) => [e.question, e.position, e.sectionId])).toEqual([
      ["First?", 0, "sec-1"],
      ["Second?", 1, "sec-1"],
      ["Third?", 2, "sec-1"],
    ]);
  });

  it("trims and collapses whitespace in the question, and stores the answer as clean HTML", async () => {
    const repo = new InMemoryQaEntryRepository();
    const result = await createQaEntry(repo, target, {
      question: "  Is   there\n parking?  ",
      answer: "  Yes.\n\nSee the map.  ",
    });
    expect(result.status === "created" && result.entry.question).toBe("Is there parking?");
    expect(result.status === "created" && result.entry.answer).toBe("<p>Yes.</p>\n\n<p>See the map.</p>");
  });

  it("allows an empty answer", async () => {
    const repo = new InMemoryQaEntryRepository();
    const result = await createQaEntry(repo, target, { question: "Q?" });
    expect(result.status === "created" && result.entry.answer).toBe("");
  });

  it("accepts formatting and safe links in the answer, and stores them in canonical form", async () => {
    const repo = new InMemoryQaEntryRepository();
    const answer =
      'Download the <b>Opticon app</b> for <a href="https://play.google.com/store/x">Android</a> or <a href="https://apps.apple.com/x">iOS</a>. Questions? Email <a href="mailto:opticon@kcimanagement.com">opticon@kcimanagement.com</a>.';
    const result = await createQaEntry(repo, target, { question: "Is there an app?", answer });
    expect(result.status === "created" && result.entry.answer).toBe(
      '<p>Download the <strong>Opticon app</strong> for <a href="https://play.google.com/store/x">Android</a> or <a href="https://apps.apple.com/x">iOS</a>. Questions? Email <a href="mailto:opticon@kcimanagement.com">opticon@kcimanagement.com</a>.</p>',
    );
  });

  it.each([
    ["an empty question", { question: "", answer: "A." }, "question"],
    ["a blank question", { question: "   ", answer: "A." }, "question"],
    ["a too-long question", { question: "q".repeat(MAX_QUESTION_LENGTH + 1), answer: "A." }, "question"],
    ["a too-long answer", { question: "Q?", answer: "a".repeat(MAX_ANSWER_LENGTH + 1) }, "answer"],
    ["an http link", { question: "Q?", answer: '<a href="http://example.com">a</a>' }, "answer"],
    ["a javascript link", { question: "Q?", answer: '<a href="javascript:alert(1)">a</a>' }, "answer"],
    ["an email link with a subject", { question: "Q?", answer: '<a href="mailto:x@example.com?subject=hi">a</a>' }, "answer"],
    ["a look-alike link text", { question: "Q?", answer: '<a href="https://evil.example.com">paypal.com</a>' }, "answer"],
    ["a script tag", { question: "Q?", answer: "<script>alert(1)</script>" }, "answer"],
    ["an image", { question: "Q?", answer: '<img src="https://example.com/x.png">' }, "answer"],
    ["a div", { question: "Q?", answer: "<div>x</div>" }, "answer"],
  ] as const)("rejects %s and stores nothing", async (_name, input, field) => {
    const repo = new InMemoryQaEntryRepository();
    const result = await createQaEntry(repo, target, input);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[field]?._errors[0]).toBeTruthy();
    expect(await repo.listByEvent("evt-1")).toHaveLength(0);
  });
});

describe("updateQaEntry", () => {
  it("changes the question and answer", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [id] = await seed(repo, ["Old?"]);
    const result = await updateQaEntry(repo, id, { question: "New?", answer: "New answer." });
    expect(result.status).toBe("updated");
    const [entry] = await repo.listByEvent("evt-1");
    expect([entry.question, entry.answer]).toEqual(["New?", "<p>New answer.</p>"]);
  });

  it("rejects invalid input and leaves the entry unchanged", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [id] = await seed(repo, ["Keep?"]);
    expect((await updateQaEntry(repo, id, { question: " ", answer: "" })).status).toBe("invalid");
    expect((await updateQaEntry(repo, id, { question: "Q?", answer: '<a href="http://x.example.com">a</a>' })).status).toBe(
      "invalid",
    );
    expect((await repo.listByEvent("evt-1"))[0].question).toBe("Keep?");
  });
});

describe("deleteQaEntry", () => {
  it("removes the entry", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [id] = await seed(repo, ["Gone?"]);
    await deleteQaEntry(repo, id);
    expect(await repo.listByEvent("evt-1")).toHaveLength(0);
  });
});

describe("movedIds", () => {
  it("swaps an entry with its neighbour", () => {
    expect(movedIds(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(movedIds(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("changes nothing at the ends or for an unknown id, returning the same array", () => {
    const ids = ["a", "b", "c"];
    expect(movedIds(ids, "a", "up")).toBe(ids);
    expect(movedIds(ids, "c", "down")).toBe(ids);
    expect(movedIds(ids, "zzz", "up")).toBe(ids);
    expect(movedIds([], "a", "down")).toEqual([]);
  });

  it("doesn't modify the array it is given", () => {
    const ids = ["a", "b", "c"];
    movedIds(ids, "a", "down");
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("moveQaEntry", () => {
  it("moves an entry up and down within its section", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [, second] = await seed(repo, ["One?", "Two?", "Three?"]);

    await moveQaEntry(repo, target, second, "up");
    expect(await order(repo)).toEqual(["Two?", "One?", "Three?"]);

    await moveQaEntry(repo, target, second, "down");
    await moveQaEntry(repo, target, second, "down");
    expect(await order(repo)).toEqual(["One?", "Three?", "Two?"]);
  });

  it("does nothing at the ends", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [first, , third] = await seed(repo, ["One?", "Two?", "Three?"]);
    await moveQaEntry(repo, target, first, "up");
    await moveQaEntry(repo, target, third, "down");
    expect(await order(repo)).toEqual(["One?", "Two?", "Three?"]);
  });

  it("only reorders the given section", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [, second] = await seed(repo, ["A1?", "A2?"]);
    const other = { eventId: "evt-1", sectionId: "sec-2" };
    await createQaEntry(repo, other, { question: "B1?" });
    await createQaEntry(repo, other, { question: "B2?" });

    await moveQaEntry(repo, target, second, "up");

    const entries = await repo.listByEvent("evt-1");
    const inSection = (id: string) => entries.filter((e) => e.sectionId === id).sort((a, b) => a.position - b.position);
    expect(inSection("sec-1").map((e) => e.question)).toEqual(["A2?", "A1?"]);
    expect(inSection("sec-2").map((e) => e.question)).toEqual(["B1?", "B2?"]);
  });

  it("keeps positions contiguous after a delete and a move", async () => {
    const repo = new InMemoryQaEntryRepository();
    const [first, second] = await seed(repo, ["One?", "Two?", "Three?"]);
    await deleteQaEntry(repo, first);
    await moveQaEntry(repo, target, second, "down");
    expect(await order(repo)).toEqual(["Three?", "Two?"]);
    expect((await repo.listByEvent("evt-1")).map((e) => e.position).sort()).toEqual([0, 1]);
  });
});
