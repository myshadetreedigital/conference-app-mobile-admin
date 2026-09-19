// The fixed icon set the mobile app's Icon component knows how to
// render — kept in sync with conference-app-mobile/src/components/icon.tsx.
export const EVENT_INFO_SECTION_ICONS = [
  "tree-pine",
  "info",
  "plane",
  "users",
  "heart",
  "building",
  "clipboard-list",
  "map",
  "map-pin",
  "wifi",
  "camera",
  "trophy",
  "presentation",
  "demo",
  "address-book",
] as const;

export type EventInfoSectionIcon = (typeof EVENT_INFO_SECTION_ICONS)[number];

// Existing mobile screens (tabs) a row can open instead of showing its own
// page — kept in sync with the link_target CHECK in the database and the
// mobile app's LINK_TARGET_ROUTES (src/lib/more-info.ts). Home and More Info
// itself are deliberately not offered.
export const EVENT_INFO_SECTION_LINK_TARGETS = ["speakers", "schedule", "sponsors", "contacts"] as const;

export type EventInfoSectionLinkTarget = (typeof EVENT_INFO_SECTION_LINK_TARGETS)[number];

// How a row's own page is laid out: formatted text, or numbered Q&A pairs on
// alternating bands (see qa-entry-repository.ts). Kept in sync with the
// page_style CHECK in the database.
export const EVENT_INFO_SECTION_PAGE_STYLES = ["text", "qa"] as const;

export type EventInfoSectionPageStyle = (typeof EVENT_INFO_SECTION_PAGE_STYLES)[number];

export interface EventInfoSection {
  id: string;
  eventId: string;
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
  /** Null means the row opens its own page (laid out per pageStyle). */
  linkTarget: EventInfoSectionLinkTarget | null;
  pageStyle: EventInfoSectionPageStyle;
}

export interface NewEventInfoSection {
  eventId: string;
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
  linkTarget: EventInfoSectionLinkTarget | null;
  pageStyle: EventInfoSectionPageStyle;
}

export interface UpdateEventInfoSectionData {
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
  linkTarget: EventInfoSectionLinkTarget | null;
  pageStyle: EventInfoSectionPageStyle;
}

export interface EventInfoSectionRepository {
  listByEvent(eventId: string): Promise<EventInfoSection[]>;
  create(data: NewEventInfoSection): Promise<EventInfoSection>;
  update(sectionId: string, data: UpdateEventInfoSectionData): Promise<void>;
  delete(sectionId: string): Promise<void>;
}
