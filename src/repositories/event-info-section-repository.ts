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

// Existing mobile screens a row can open instead of showing a page of
// text — kept in sync with the link_target CHECK in the database and the
// mobile app's More Info screen.
export const EVENT_INFO_SECTION_LINK_TARGETS = ["speakers"] as const;

export type EventInfoSectionLinkTarget = (typeof EVENT_INFO_SECTION_LINK_TARGETS)[number];

export interface EventInfoSection {
  id: string;
  eventId: string;
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
  /** Null means a normal page of text. */
  linkTarget: EventInfoSectionLinkTarget | null;
}

export interface NewEventInfoSection {
  eventId: string;
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
  linkTarget: EventInfoSectionLinkTarget | null;
}

export interface UpdateEventInfoSectionData {
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
  linkTarget: EventInfoSectionLinkTarget | null;
}

export interface EventInfoSectionRepository {
  listByEvent(eventId: string): Promise<EventInfoSection[]>;
  create(data: NewEventInfoSection): Promise<EventInfoSection>;
  update(sectionId: string, data: UpdateEventInfoSectionData): Promise<void>;
  delete(sectionId: string): Promise<void>;
}
