import {
  EVENT_INFO_SECTION_LINK_TARGETS,
  type EventInfoSectionLinkTarget,
  type EventInfoSectionPageStyle,
} from "@/repositories/event-info-section-repository";

// The admin form offers one "when tapped" choice for a More Info row; the
// database stores it as two columns (page_style and link_target).
//   text            -> the row opens a page of formatted text
//   qa              -> the row opens a page of numbered question-and-answer pairs
//   screen:<target> -> the row jumps to one of the app's existing screens
export type ScreenRowType = `screen:${EventInfoSectionLinkTarget}`;
export type RowType = "text" | "qa" | ScreenRowType;

const SCREEN_LABELS: Record<EventInfoSectionLinkTarget, string> = {
  speakers: "Speakers",
  schedule: "Schedule",
  sponsors: "Sponsors",
  contacts: "Contacts",
};

export const SCREEN_ROW_TYPES = EVENT_INFO_SECTION_LINK_TARGETS.map((t) => `screen:${t}` as ScreenRowType);

export const ROW_TYPES: readonly RowType[] = ["text", "qa", ...SCREEN_ROW_TYPES];

export function rowTypeLabel(type: RowType): string {
  if (type === "text") return "A page of text";
  if (type === "qa") return "A Q&A page (questions and answers)";
  return SCREEN_LABELS[type.slice("screen:".length) as EventInfoSectionLinkTarget];
}

/** The form's choices, grouped for the dropdown. */
export const ROW_TYPE_GROUPS: { label: string; types: readonly RowType[] }[] = [
  { label: "Opens its own page", types: ["text", "qa"] },
  { label: "Opens an existing screen", types: SCREEN_ROW_TYPES },
];

/** True for a row that jumps to an existing screen. */
export function isScreenRowType(type: RowType): type is ScreenRowType {
  return type.startsWith("screen:");
}

/** The stored fields for a submitted choice. Anything unrecognised is a text page. */
export function fieldsForRowType(value: string | null | undefined): {
  pageStyle: EventInfoSectionPageStyle;
  linkTarget: EventInfoSectionLinkTarget | null;
} {
  if (value === "qa") return { pageStyle: "qa", linkTarget: null };
  const target = (EVENT_INFO_SECTION_LINK_TARGETS as readonly string[]).find((t) => `screen:${t}` === value);
  if (target) return { pageStyle: "text", linkTarget: target as EventInfoSectionLinkTarget };
  return { pageStyle: "text", linkTarget: null };
}

/** The choice to show for a stored row. */
export function rowTypeOf(section: {
  pageStyle: EventInfoSectionPageStyle;
  linkTarget: EventInfoSectionLinkTarget | null;
}): RowType {
  if (section.linkTarget) return `screen:${section.linkTarget}`;
  return section.pageStyle === "qa" ? "qa" : "text";
}
