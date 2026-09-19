// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewSectionForm, SectionEditForm } from "./section-forms";

// The page is first rendered on the server, then "hydrated" in the browser. If that
// step fails, the form stays a plain server form and the inputs only change after a
// save. These tests do exactly what Next does: render to a string, then hydrate it.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const action = vi.fn(async () => ({}));
afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

async function hydrate(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.innerHTML = renderToString(element);
  const errors: unknown[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args) => { errors.push(args); });
  await act(async () => { hydrateRoot(container, element, { onRecoverableError: (e) => errors.push(e) }); });
  spy.mockRestore();
  return { container, errors };
}

const shown = (el: Element | null) => !!el && !el.closest("[hidden]");

describe("after server render + hydration", () => {
  it("hydrates a new-row form with no errors, and picking Q&A shows the boxes at once", async () => {
    const { container, errors } = await hydrate(<NewSectionForm action={action} />);
    expect(errors).toEqual([]);

    const select = container.querySelector('select[name="rowType"]') as HTMLSelectElement;
    expect(shown(container.querySelector('input[name="qaQuestion"]'))).toBe(false);
    await act(async () => {
      select.value = "qa";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(shown(container.querySelector('input[name="qaQuestion"]'))).toBe(true);
    expect(shown(container.querySelector('textarea[name="body"]'))).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("hydrates a saved row's form with no errors, and collapsing works", async () => {
    const entries = [{ id: "e1", question: "Q1?", answer: "" }, { id: "e2", question: "Q2?", answer: "" }];
    const { container, errors } = await hydrate(
      <SectionEditForm action={action} section={{ id: "s1", icon: "info", title: "FAQ", body: "", rowType: "qa" }} entries={entries} />,
    );
    expect(errors).toEqual([]);
    const toggle = container.querySelector('button[aria-expanded]') as HTMLButtonElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await act(async () => { toggle.click(); });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });
});
