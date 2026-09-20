// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { EVENT_INFO_SECTION_ICONS } from "@/repositories/event-info-section-repository";
import { IconPicker, SectionIcon } from "./icon-picker";

afterEach(cleanup);

function Harness({ start = "info" }: { start?: string }) {
  const [icon, setIcon] = useState(start);
  return (
    <form>
      <IconPicker value={icon} onChange={setIcon} />
    </form>
  );
}

const hidden = () => document.querySelector('input[name="icon"]') as HTMLInputElement;
const openPicker = async () => userEvent.click(screen.getByRole("button", { name: /^Icon: .*Change$/ }));

describe("IconPicker", () => {
  it("shows the current icon and its label, and submits its name", () => {
    render(<Harness start="wifi" />);
    expect(screen.getByRole("button", { name: "Icon: Wi-Fi. Change" })).toBeTruthy();
    expect(hidden().value).toBe("wifi");
    expect(hidden().type).toBe("hidden");
  });

  it("stays closed until asked, then shows every icon in groups", async () => {
    render(<Harness />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    await openPicker();
    expect(screen.getAllByRole("radiogroup").length).toBe(8);
    expect(screen.getAllByRole("radio")).toHaveLength(EVENT_INFO_SECTION_ICONS.length);
  });

  it("marks the current icon as selected", async () => {
    render(<Harness start="coffee" />);
    await openPicker();
    expect(screen.getByRole("radio", { name: "Coffee" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
  });

  it("choosing an icon changes the value at once and closes the panel", async () => {
    render(<Harness />);
    await openPicker();
    await userEvent.click(screen.getByRole("radio", { name: "Parking" }));
    expect(hidden().value).toBe("parking");
    expect(screen.getByRole("button", { name: "Icon: Parking. Change" })).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("searching narrows the icons and groups as you type", async () => {
    render(<Harness />);
    await openPicker();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search icons" }), "coffee");
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual(["Coffee"]);
    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    expect(within(screen.getByRole("radiogroup")).getByText("Food & drink")).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    render(<Harness />);
    await openPicker();
    await userEvent.type(screen.getByRole("searchbox"), "zzzz");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText(/No icons match/)).toBeTruthy();
  });

  it("clears the search after a choice, so it opens showing everything next time", async () => {
    render(<Harness />);
    await openPicker();
    await userEvent.type(screen.getByRole("searchbox"), "hotel");
    await userEvent.click(screen.getByRole("radio", { name: "Hotel" }));
    await openPicker();
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    expect(screen.getAllByRole("radio")).toHaveLength(EVENT_INFO_SECTION_ICONS.length);
  });

  it("closes on Escape without changing the icon", async () => {
    render(<Harness start="heart" />);
    await openPicker();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(hidden().value).toBe("heart");
  });

  it("closes when focus moves elsewhere", async () => {
    render(
      <>
        <Harness />
        <button type="button">Elsewhere</button>
      </>,
    );
    await openPicker();
    await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("shows a stored name it doesn't know as the information icon, without breaking", async () => {
    render(<Harness start="some-future-icon" />);
    expect(screen.getByRole("button", { name: "Icon: Information. Change" })).toBeTruthy();
    expect(hidden().value).toBe("some-future-icon");
  });

  it("every icon draws something", async () => {
    for (const name of EVENT_INFO_SECTION_ICONS) {
      const { container, unmount } = render(<SectionIcon name={name} />);
      expect(container.querySelector("path")?.getAttribute("d")?.length ?? 0).toBeGreaterThan(20);
      unmount();
    }
  });
});
