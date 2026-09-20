// The icons a More Info row can use, in the order the admin's picker shows them
// (grouped: general, schedule, getting around, venue, food, people, contact, safety).
// This is the list validation checks against. Each name needs:
//   * display data in src/lib/section-icons.ts (a label, group and drawing) — the
//     compiler checks this;
//   * a mapping in the mobile app's src/components/icon.tsx (its ICONS table). A
//     name the phone doesn't know yet is shown as the information icon, so adding
//     one here before the app is updated is safe.
// The database only checks that the name is well-formed (migration 0020), so adding
// an icon never needs a migration.
export const EVENT_INFO_SECTION_ICONS = [
  "info",
  "tree-pine",
  "clipboard-list",
  "document",
  "book",
  "newspaper",
  "help",
  "faq",
  "lightbulb",
  "flag",
  "star",
  "bookmark",
  "bell",
  "megaphone",
  "survey",
  "feedback",
  "gift",
  "trophy",
  "award",
  "heart",
  "thumbs-up",
  "rocket",
  "party",
  "music",
  "calendar",
  "clock",
  "ticket",
  "badge",
  "address-book",
  "qr-code",
  "plane",
  "train",
  "subway",
  "bus",
  "taxi",
  "car",
  "parking",
  "bike",
  "walk",
  "luggage",
  "map",
  "map-pin",
  "compass",
  "directions",
  "navigation",
  "sun",
  "umbrella",
  "building",
  "hotel",
  "home",
  "door",
  "elevator",
  "stairs",
  "restroom",
  "accessibility",
  "family",
  "baby",
  "pets",
  "wifi",
  "power",
  "coat-check",
  "lock",
  "key",
  "store",
  "cart",
  "cash",
  "credit-card",
  "gym",
  "pool",
  "spa",
  "laundry",
  "restaurant",
  "coffee",
  "cocktail",
  "beer",
  "wine",
  "water",
  "cake",
  "dietary",
  "users",
  "person",
  "handshake",
  "presentation",
  "microphone",
  "demo",
  "camera",
  "video",
  "laptop",
  "tablet",
  "volunteer",
  "support",
  "phone",
  "mobile",
  "email",
  "chat",
  "link",
  "globe",
  "download",
  "share",
  "medical",
  "first-aid",
  "hospital",
  "fire",
  "alert",
  "shield",
  "security",
  "lifebuoy",
  "mask",
  "no-smoking",
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
