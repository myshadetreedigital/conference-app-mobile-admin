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
] as const;

export type EventInfoSectionIcon = (typeof EVENT_INFO_SECTION_ICONS)[number];

export interface EventInfoSection {
  id: string;
  eventId: string;
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
}

export interface NewEventInfoSection {
  eventId: string;
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
}

export interface UpdateEventInfoSectionData {
  icon: EventInfoSectionIcon;
  title: string;
  body: string;
}

export interface EventInfoSectionRepository {
  listByEvent(eventId: string): Promise<EventInfoSection[]>;
  create(data: NewEventInfoSection): Promise<EventInfoSection>;
  update(sectionId: string, data: UpdateEventInfoSectionData): Promise<void>;
  delete(sectionId: string): Promise<void>;
}
