// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewSectionForm, SectionEditForm, type SectionFormState } from "./section-forms";

afterEach(cleanup);

type Action = (previous: SectionFormState, formData: FormData) => Promise<SectionFormState>;
const makeAction = (result: SectionFormState = {}) => vi.fn<Action>(async () => result);

const select = () => screen.getByLabelText(/when tapped/i) as HTMLSelectElement;
const textarea = () => screen.getByPlaceholderText("Body (optional)") as HTMLTextAreaElement;
const qaHeading = () => screen.getByText("Questions and answers");
// Elements marked `hidden` are still in the page (so their values submit) but not shown.
const isShown = (el: HTMLElement) => !el.closest("[hidden]");

const section = { id: "s1", icon: "info", title: "FAQ", body: "", rowType: "qa" as const };
const entries = [
  { id: "e1", question: "How do I get there?", answer: "<p>By train.</p>" },
  { id: "e2", question: "Is there parking?", answer: "<p>Yes.</p>" },
  { id: "e3", question: "What should I bring?", answer: "<p>A jacket.</p>" },
];

describe("choosing a type changes the inputs at once, with no server call", () => {
  it("a new row starts as a text page: the text box shows and the question boxes don't", () => {
    render(<NewSectionForm action={makeAction()} />);
    expect(isShown(textarea())).toBe(true);
    expect(isShown(qaHeading())).toBe(false);
  });

  it("picking Q&A shows the question and answer boxes immediately, even on a brand-new row", async () => {
    const action = makeAction();
    render(<NewSectionForm action={action} />);
    await userEvent.selectOptions(select(), "qa");

    expect(isShown(qaHeading())).toBe(true);
    expect(isShown(screen.getByPlaceholderText("Question"))).toBe(true);
    expect(isShown(screen.getByPlaceholderText("Answer"))).toBe(true);
    expect(isShown(textarea())).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("picking an existing screen hides both, explains why, and calls nothing", async () => {
    const action = makeAction();
    render(<NewSectionForm action={action} />);
    await userEvent.selectOptions(select(), "screen:schedule");

    expect(isShown(textarea())).toBe(false);
    expect(isShown(qaHeading())).toBe(false);
    expect(screen.getByText(/opens the Schedule screen, so it has no page text/i)).toBeTruthy();
    expect(action).not.toHaveBeenCalled();
  });

  it("switching back restores the text box and clears the note", async () => {
    render(<NewSectionForm action={makeAction()} />);
    await userEvent.selectOptions(select(), "screen:contacts");
    await userEvent.selectOptions(select(), "text");
    expect(isShown(textarea())).toBe(true);
    expect(screen.queryByText(/no page text/i)).toBeNull();
  });

  it("keeps what was typed when the type is switched away and back", async () => {
    render(<NewSectionForm action={makeAction()} />);
    await userEvent.type(textarea(), "Some page text");
    await userEvent.selectOptions(select(), "qa");
    await userEvent.type(screen.getByPlaceholderText("Question"), "Kept?");
    await userEvent.selectOptions(select(), "text");
    expect(textarea().value).toBe("Some page text");
    await userEvent.selectOptions(select(), "qa");
    expect((screen.getByPlaceholderText("Question") as HTMLInputElement).value).toBe("Kept?");
  });

  it("works the same way when editing a saved row", async () => {
    const action = makeAction();
    render(<SectionEditForm action={action} section={{ ...section, rowType: "text" }} entries={[]} />);
    expect(isShown(textarea())).toBe(true);
    await userEvent.selectOptions(select(), "qa");
    expect(isShown(qaHeading())).toBe(true);
    expect(isShown(textarea())).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("offers Speakers, Schedule, Sponsors and Contacts under 'Opens an existing screen', and not Home", () => {
    render(<NewSectionForm action={makeAction()} />);
    const group = within(select()).getByRole("group", { name: "Opens an existing screen" });
    expect(within(group).getAllByRole("option").map((o) => o.textContent)).toEqual(["Speakers", "Schedule", "Sponsors", "Contacts"]);
  });
});

describe("question containers", () => {
  const editForm = (action = makeAction()) => render(<SectionEditForm action={action} section={section} entries={entries} />);
  const panel = (n: number) => document.getElementById(screen.getByRole("button", { name: new RegExp(`^▸?▾?\\s*${n}\\.`) }).getAttribute("aria-controls")!)!;
  const header = (n: number) => screen.getByRole("button", { name: new RegExp(`^\\S?\\s*${n}\\.`) });

  it("saved questions start collapsed, each showing its question as the title", () => {
    editForm();
    for (const q of entries) expect(screen.getByText(q.question)).toBeTruthy();
    for (const n of [1, 2, 3]) {
      expect(header(n).getAttribute("aria-expanded")).toBe("false");
      expect(isShown(panel(n))).toBe(false);
    }
  });

  it("clicking a title opens just that container, and clicking again closes it", async () => {
    editForm();
    await userEvent.click(header(2));
    expect(header(2).getAttribute("aria-expanded")).toBe("true");
    expect(isShown(panel(2))).toBe(true);
    expect(isShown(panel(1))).toBe(false);
    expect(isShown(panel(3))).toBe(false);
    await userEvent.click(header(2));
    expect(isShown(panel(2))).toBe(false);
  });

  it("Expand all opens every container and Collapse all closes them again", async () => {
    editForm();
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    for (const n of [1, 2, 3]) expect(isShown(panel(n))).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    for (const n of [1, 2, 3]) expect(isShown(panel(n))).toBe(false);
  });

  it("the question's title follows what is typed in it", async () => {
    editForm();
    await userEvent.click(header(1));
    const input = screen.getByLabelText("Question 1");
    await userEvent.clear(input);
    await userEvent.type(input, "Changed?");
    expect(header(1).textContent).toContain("Changed?");
  });

  it("a blank question shows a placeholder title", async () => {
    render(<NewSectionForm action={makeAction()} />);
    await userEvent.selectOptions(select(), "qa");
    expect(screen.getByText("New question")).toBeTruthy();
  });

  it("adds a new, open container at the end", async () => {
    editForm();
    await userEvent.click(screen.getByRole("button", { name: "+ Add question" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(isShown(panel(4))).toBe(true);
    expect(header(4).textContent).toContain("New question");
  });

  it("removes a container", async () => {
    editForm();
    await userEvent.click(screen.getByRole("button", { name: "Remove question 2" }));
    expect(screen.queryByText("Is there parking?")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("moves containers up and down, and disables the arrows at the ends", async () => {
    editForm();
    expect((screen.getByRole("button", { name: "Move question 1 up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move question 3 down" }) as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Move question 3 up" }));
    const titles = screen.getAllByRole("listitem").map((li) => li.querySelector("button span.truncate")?.textContent);
    expect(titles).toEqual(["How do I get there?", "What should I bring?", "Is there parking?"]);
  });

  it("shows how many questions there are", async () => {
    editForm();
    expect(screen.getByText("(3)")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove question 1" }));
    expect(screen.getByText("(2)")).toBeTruthy();
  });

  it("offers Expand/Collapse all only when there is more than one question", async () => {
    render(<SectionEditForm action={makeAction()} section={section} entries={[entries[0]]} />);
    expect(screen.queryByRole("button", { name: /expand all|collapse all/i })).toBeNull();
  });
});

describe("saving", () => {
  const editForm = (action: ReturnType<typeof makeAction>) =>
    render(<SectionEditForm action={action} section={section} entries={entries} />);

  it("sends every question in page order — collapsed ones included — with their ids", async () => {
    const action = makeAction();
    editForm(action);
    await userEvent.click(screen.getByRole("button", { name: "Move question 3 up" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0][1];
    expect(data.getAll("qaId")).toEqual(["e1", "e3", "e2"]);
    expect(data.getAll("qaQuestion")).toEqual(["How do I get there?", "What should I bring?", "Is there parking?"]);
    expect(data.getAll("qaAnswer")).toEqual(["<p>By train.</p>", "<p>A jacket.</p>", "<p>Yes.</p>"]);
    expect(data.get("rowType")).toBe("qa");
    expect(data.get("sectionId")).toBe("s1");
    expect(data.get("title")).toBe("FAQ");
  });

  it("sends a newly added question with no id, and leaves out one that was removed", async () => {
    const action = makeAction();
    editForm(action);
    await userEvent.click(screen.getByRole("button", { name: "Remove question 1" }));
    await userEvent.click(screen.getByRole("button", { name: "+ Add question" }));
    await userEvent.type(screen.getByLabelText("Question 3"), "A new one?");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0][1];
    expect(data.getAll("qaId")).toEqual(["e2", "e3", ""]);
    expect(data.getAll("qaQuestion")).toEqual(["Is there parking?", "What should I bring?", "A new one?"]);
  });

  it("creates a row and its questions in one go", async () => {
    const action = makeAction();
    render(<NewSectionForm action={action} />);
    await userEvent.type(screen.getByPlaceholderText("Title"), "Before you're here");
    await userEvent.selectOptions(select(), "qa");
    await userEvent.type(screen.getByPlaceholderText("Question"), "Age limit?");
    await userEvent.type(screen.getByPlaceholderText("Answer"), "21 or older.");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0][1];
    expect(data.get("title")).toBe("Before you're here");
    expect(data.get("rowType")).toBe("qa");
    expect(data.getAll("qaQuestion")).toEqual(["Age limit?"]);
    expect(data.getAll("qaAnswer")).toEqual(["21 or older."]);
    expect(data.getAll("qaId")).toEqual([""]);
  });

  it("sends the chosen existing screen", async () => {
    const action = makeAction();
    render(<NewSectionForm action={action} />);
    await userEvent.type(screen.getByPlaceholderText("Title"), "Speakers");
    await userEvent.selectOptions(select(), "screen:speakers");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get("rowType")).toBe("screen:speakers");
  });

  it("shows a problem reported by the server, and keeps everything that was typed", async () => {
    const action = makeAction({ error: "Question 2: <div> isn't allowed." });
    editForm(action);
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    const answer = screen.getByLabelText("Answer 2");
    await userEvent.clear(answer);
    await userEvent.type(answer, "my careful edit");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect((await screen.findByRole("alert")).textContent).toContain("<div> isn't allowed");
    expect((screen.getByLabelText("Answer 2") as HTMLTextAreaElement).value).toBe("my careful edit");
    expect((screen.getByLabelText("Question 1") as HTMLInputElement).value).toBe("How do I get there?");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("disables the button and says so while saving", async () => {
    let finish!: () => void;
    const action = vi.fn<Action>(() => new Promise((resolve) => (finish = () => resolve({}))));
    editForm(action);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const saving = (await screen.findByRole("button", { name: "Saving…" })) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeTruthy());
  });

  it("stops adding at the limit", async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `e${i}`, question: `Q${i}?`, answer: "" }));
    render(<SectionEditForm action={makeAction()} section={section} entries={many} />);
    expect((screen.getByRole("button", { name: "+ Add question" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
