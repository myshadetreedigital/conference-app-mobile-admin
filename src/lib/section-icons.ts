// Display data for the More Info row icons: a label, a group, and the icon drawing
// (Material Design Icons, the same set the mobile app draws with, in the outline
// style the More Info screen uses), so the admin can show exactly what a row will
// look like. The list of allowed names itself is EVENT_INFO_SECTION_ICONS in
// src/repositories/event-info-section-repository.ts; the compiler checks that every
// name there has an entry here.
//
// To add an icon: add its name to EVENT_INFO_SECTION_ICONS, add an entry below
// (pick its drawing from https://pictogrammers.com/library/mdi/), and add the same
// name to ICONS in the mobile app's src/components/icon.tsx. Only the drawings
// imported here are included in the admin page.
import {
  mdiAccountGroupOutline,
  mdiAccountOutline,
  mdiAirplane,
  mdiAlertOutline,
  mdiBabyFaceOutline,
  mdiBadgeAccountOutline,
  mdiBagSuitcaseOutline,
  mdiBedOutline,
  mdiBeerOutline,
  mdiBellOutline,
  mdiBike,
  mdiBookAccountOutline,
  mdiBookOpenOutline,
  mdiBookmarkOutline,
  mdiBullhornOutline,
  mdiBus,
  mdiCakeVariantOutline,
  mdiCalendarOutline,
  mdiCameraOutline,
  mdiCarOutline,
  mdiCartOutline,
  mdiCashMultiple,
  mdiCellphone,
  mdiChartBoxOutline,
  mdiClipboardListOutline,
  mdiClockOutline,
  mdiCoffeeOutline,
  mdiCommentQuestionOutline,
  mdiCompassOutline,
  mdiCreditCardOutline,
  mdiDoorOpen,
  mdiDownloadOutline,
  mdiDumbbell,
  mdiElevatorPassengerOutline,
  mdiEmailOutline,
  mdiFaceAgent,
  mdiFaceMaskOutline,
  mdiFileDocumentOutline,
  mdiFireExtinguisher,
  mdiFlagOutline,
  mdiFoodAppleOutline,
  mdiGiftOutline,
  mdiGlassCocktail,
  mdiGlassWine,
  mdiHandHeartOutline,
  mdiHandshakeOutline,
  mdiHanger,
  mdiHeartOutline,
  mdiHelpCircleOutline,
  mdiHomeOutline,
  mdiHospitalBoxOutline,
  mdiHospitalBuilding,
  mdiHumanMaleBoard,
  mdiHumanMaleFemale,
  mdiHumanMaleFemaleChild,
  mdiInformationOutline,
  mdiKeyOutline,
  mdiLaptop,
  mdiLifebuoy,
  mdiLightbulbOutline,
  mdiLinkVariant,
  mdiLockOutline,
  mdiMapMarkerOutline,
  mdiMapOutline,
  mdiMedalOutline,
  mdiMedicalBag,
  mdiMessageStarOutline,
  mdiMessageTextOutline,
  mdiMicrophoneOutline,
  mdiMonitorAccount,
  mdiMusicNoteOutline,
  mdiNavigationOutline,
  mdiNewspaperVariantOutline,
  mdiOfficeBuildingOutline,
  mdiParking,
  mdiPartyPopper,
  mdiPawOutline,
  mdiPhoneOutline,
  mdiPineTreeVariantOutline,
  mdiPool,
  mdiPowerPlugOutline,
  mdiQrcodeScan,
  mdiRocketLaunchOutline,
  mdiShareVariantOutline,
  mdiShieldAccountOutline,
  mdiShieldCheckOutline,
  mdiSignDirection,
  mdiSilverwareForkKnife,
  mdiSmokingOff,
  mdiSpaOutline,
  mdiStairs,
  mdiStarOutline,
  mdiStoreOutline,
  mdiSubwayVariant,
  mdiTablet,
  mdiTaxi,
  mdiThumbUpOutline,
  mdiTicketOutline,
  mdiTrain,
  mdiTrophyOutline,
  mdiUmbrellaOutline,
  mdiVideoOutline,
  mdiWalk,
  mdiWashingMachine,
  mdiWaterOutline,
  mdiWeatherSunny,
  mdiWeb,
  mdiWheelchairAccessibility,
  mdiWifi,
} from "@mdi/js";
import { EVENT_INFO_SECTION_ICONS, type EventInfoSectionIcon } from "@/repositories/event-info-section-repository";

export interface SectionIconDetails {
  label: string;
  group: string;
  /** SVG path data for a 24×24 viewBox. */
  path: string;
}

/** The groups, in the order the picker shows them. */
export const SECTION_ICON_GROUPS = [
  "General",
  "Schedule & tickets",
  "Getting around",
  "Venue & facilities",
  "Food & drink",
  "People & sessions",
  "Contact & links",
  "Health & safety",
] as const;

export const SECTION_ICON_DETAILS: Record<EventInfoSectionIcon, SectionIconDetails> = {
  "info"              : { label: "Information", group: "General", path: mdiInformationOutline },
  "tree-pine"         : { label: "About", group: "General", path: mdiPineTreeVariantOutline },
  "clipboard-list"    : { label: "Checklist / registration", group: "General", path: mdiClipboardListOutline },
  "document"          : { label: "Document", group: "General", path: mdiFileDocumentOutline },
  "book"              : { label: "Guide / book", group: "General", path: mdiBookOpenOutline },
  "newspaper"         : { label: "News", group: "General", path: mdiNewspaperVariantOutline },
  "help"              : { label: "Help", group: "General", path: mdiHelpCircleOutline },
  "faq"               : { label: "Questions (FAQ)", group: "General", path: mdiCommentQuestionOutline },
  "lightbulb"         : { label: "Ideas", group: "General", path: mdiLightbulbOutline },
  "flag"              : { label: "Flag", group: "General", path: mdiFlagOutline },
  "star"              : { label: "Star", group: "General", path: mdiStarOutline },
  "bookmark"          : { label: "Bookmark", group: "General", path: mdiBookmarkOutline },
  "bell"              : { label: "Notifications", group: "General", path: mdiBellOutline },
  "megaphone"         : { label: "Announcements", group: "General", path: mdiBullhornOutline },
  "survey"            : { label: "Survey / poll", group: "General", path: mdiChartBoxOutline },
  "feedback"          : { label: "Feedback / review", group: "General", path: mdiMessageStarOutline },
  "gift"              : { label: "Gift", group: "General", path: mdiGiftOutline },
  "trophy"            : { label: "Trophy", group: "General", path: mdiTrophyOutline },
  "award"             : { label: "Award", group: "General", path: mdiMedalOutline },
  "heart"             : { label: "Heart", group: "General", path: mdiHeartOutline },
  "thumbs-up"         : { label: "Thumbs up", group: "General", path: mdiThumbUpOutline },
  "rocket"            : { label: "Launch", group: "General", path: mdiRocketLaunchOutline },
  "party"             : { label: "Celebration", group: "General", path: mdiPartyPopper },
  "music"             : { label: "Music", group: "General", path: mdiMusicNoteOutline },
  "calendar"          : { label: "Calendar", group: "Schedule & tickets", path: mdiCalendarOutline },
  "clock"             : { label: "Time", group: "Schedule & tickets", path: mdiClockOutline },
  "ticket"            : { label: "Ticket", group: "Schedule & tickets", path: mdiTicketOutline },
  "badge"             : { label: "Badge", group: "Schedule & tickets", path: mdiBadgeAccountOutline },
  "address-book"      : { label: "Registration / contacts", group: "Schedule & tickets", path: mdiBookAccountOutline },
  "qr-code"           : { label: "QR code", group: "Schedule & tickets", path: mdiQrcodeScan },
  "plane"             : { label: "Flights", group: "Getting around", path: mdiAirplane },
  "train"             : { label: "Train", group: "Getting around", path: mdiTrain },
  "subway"            : { label: "Subway / metro", group: "Getting around", path: mdiSubwayVariant },
  "bus"               : { label: "Bus / shuttle", group: "Getting around", path: mdiBus },
  "taxi"              : { label: "Taxi / rideshare", group: "Getting around", path: mdiTaxi },
  "car"               : { label: "Car", group: "Getting around", path: mdiCarOutline },
  "parking"           : { label: "Parking", group: "Getting around", path: mdiParking },
  "bike"              : { label: "Bike", group: "Getting around", path: mdiBike },
  "walk"              : { label: "Walking", group: "Getting around", path: mdiWalk },
  "luggage"           : { label: "Luggage", group: "Getting around", path: mdiBagSuitcaseOutline },
  "map"               : { label: "Map", group: "Getting around", path: mdiMapOutline },
  "map-pin"           : { label: "Location", group: "Getting around", path: mdiMapMarkerOutline },
  "compass"           : { label: "Compass", group: "Getting around", path: mdiCompassOutline },
  "directions"        : { label: "Directions", group: "Getting around", path: mdiSignDirection },
  "navigation"        : { label: "Navigation", group: "Getting around", path: mdiNavigationOutline },
  "sun"               : { label: "Weather", group: "Getting around", path: mdiWeatherSunny },
  "umbrella"          : { label: "Umbrella", group: "Getting around", path: mdiUmbrellaOutline },
  "building"          : { label: "Venue / building", group: "Venue & facilities", path: mdiOfficeBuildingOutline },
  "hotel"             : { label: "Hotel", group: "Venue & facilities", path: mdiBedOutline },
  "home"              : { label: "Home", group: "Venue & facilities", path: mdiHomeOutline },
  "door"              : { label: "Entrance", group: "Venue & facilities", path: mdiDoorOpen },
  "elevator"          : { label: "Elevator", group: "Venue & facilities", path: mdiElevatorPassengerOutline },
  "stairs"            : { label: "Stairs", group: "Venue & facilities", path: mdiStairs },
  "restroom"          : { label: "Restrooms", group: "Venue & facilities", path: mdiHumanMaleFemale },
  "accessibility"     : { label: "Accessibility", group: "Venue & facilities", path: mdiWheelchairAccessibility },
  "family"            : { label: "Family", group: "Venue & facilities", path: mdiHumanMaleFemaleChild },
  "baby"              : { label: "Nursing / baby", group: "Venue & facilities", path: mdiBabyFaceOutline },
  "pets"              : { label: "Pets", group: "Venue & facilities", path: mdiPawOutline },
  "wifi"              : { label: "Wi-Fi", group: "Venue & facilities", path: mdiWifi },
  "power"             : { label: "Charging / power", group: "Venue & facilities", path: mdiPowerPlugOutline },
  "coat-check"        : { label: "Coat check", group: "Venue & facilities", path: mdiHanger },
  "lock"              : { label: "Lockers / security", group: "Venue & facilities", path: mdiLockOutline },
  "key"               : { label: "Key", group: "Venue & facilities", path: mdiKeyOutline },
  "store"             : { label: "Shop / store", group: "Venue & facilities", path: mdiStoreOutline },
  "cart"              : { label: "Cart", group: "Venue & facilities", path: mdiCartOutline },
  "cash"              : { label: "Cash / ATM", group: "Venue & facilities", path: mdiCashMultiple },
  "credit-card"       : { label: "Payment", group: "Venue & facilities", path: mdiCreditCardOutline },
  "gym"               : { label: "Gym", group: "Venue & facilities", path: mdiDumbbell },
  "pool"              : { label: "Pool", group: "Venue & facilities", path: mdiPool },
  "spa"               : { label: "Spa", group: "Venue & facilities", path: mdiSpaOutline },
  "laundry"           : { label: "Laundry", group: "Venue & facilities", path: mdiWashingMachine },
  "restaurant"        : { label: "Restaurant", group: "Food & drink", path: mdiSilverwareForkKnife },
  "coffee"            : { label: "Coffee", group: "Food & drink", path: mdiCoffeeOutline },
  "cocktail"          : { label: "Cocktails", group: "Food & drink", path: mdiGlassCocktail },
  "beer"              : { label: "Beer", group: "Food & drink", path: mdiBeerOutline },
  "wine"              : { label: "Wine", group: "Food & drink", path: mdiGlassWine },
  "water"             : { label: "Water", group: "Food & drink", path: mdiWaterOutline },
  "cake"              : { label: "Dessert", group: "Food & drink", path: mdiCakeVariantOutline },
  "dietary"           : { label: "Dietary needs", group: "Food & drink", path: mdiFoodAppleOutline },
  "users"             : { label: "Attendees / group", group: "People & sessions", path: mdiAccountGroupOutline },
  "person"            : { label: "Person", group: "People & sessions", path: mdiAccountOutline },
  "handshake"         : { label: "Networking", group: "People & sessions", path: mdiHandshakeOutline },
  "presentation"      : { label: "Speakers", group: "People & sessions", path: mdiHumanMaleBoard },
  "microphone"        : { label: "Microphone", group: "People & sessions", path: mdiMicrophoneOutline },
  "demo"              : { label: "Demos", group: "People & sessions", path: mdiMonitorAccount },
  "camera"            : { label: "Photos / headshots", group: "People & sessions", path: mdiCameraOutline },
  "video"             : { label: "Video", group: "People & sessions", path: mdiVideoOutline },
  "laptop"            : { label: "Laptop", group: "People & sessions", path: mdiLaptop },
  "tablet"            : { label: "Tablet", group: "People & sessions", path: mdiTablet },
  "volunteer"         : { label: "Volunteers", group: "People & sessions", path: mdiHandHeartOutline },
  "support"           : { label: "Support desk", group: "People & sessions", path: mdiFaceAgent },
  "phone"             : { label: "Phone", group: "Contact & links", path: mdiPhoneOutline },
  "mobile"            : { label: "Mobile", group: "Contact & links", path: mdiCellphone },
  "email"             : { label: "Email", group: "Contact & links", path: mdiEmailOutline },
  "chat"              : { label: "Chat", group: "Contact & links", path: mdiMessageTextOutline },
  "link"              : { label: "Link", group: "Contact & links", path: mdiLinkVariant },
  "globe"             : { label: "Website", group: "Contact & links", path: mdiWeb },
  "download"          : { label: "Download", group: "Contact & links", path: mdiDownloadOutline },
  "share"             : { label: "Share", group: "Contact & links", path: mdiShareVariantOutline },
  "medical"           : { label: "Medical", group: "Health & safety", path: mdiMedicalBag },
  "first-aid"         : { label: "First aid", group: "Health & safety", path: mdiHospitalBoxOutline },
  "hospital"          : { label: "Hospital", group: "Health & safety", path: mdiHospitalBuilding },
  "fire"              : { label: "Fire safety", group: "Health & safety", path: mdiFireExtinguisher },
  "alert"             : { label: "Alert", group: "Health & safety", path: mdiAlertOutline },
  "shield"            : { label: "Safety", group: "Health & safety", path: mdiShieldCheckOutline },
  "security"          : { label: "Security", group: "Health & safety", path: mdiShieldAccountOutline },
  "lifebuoy"          : { label: "Emergency help", group: "Health & safety", path: mdiLifebuoy },
  "mask"              : { label: "Face masks", group: "Health & safety", path: mdiFaceMaskOutline },
  "no-smoking"        : { label: "No smoking", group: "Health & safety", path: mdiSmokingOff },
};

export interface IconChoice {
  key: EventInfoSectionIcon;
  details: SectionIconDetails;
}

export interface IconGroup {
  label: string;
  icons: IconChoice[];
}

/**
 * The icons that match a search, still in their groups and in picker order. Every
 * word typed must appear somewhere in the icon's label, name or group, in any case;
 * an empty search matches everything.
 */
export function filterIconGroups(query: string): IconGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return SECTION_ICON_GROUPS.map((label) => ({
    label: label as string,
    icons: EVENT_INFO_SECTION_ICONS.filter((key) => SECTION_ICON_DETAILS[key].group === label)
      .map((key) => ({ key, details: SECTION_ICON_DETAILS[key] }))
      .filter(({ key, details }) => {
        const haystack = `${key} ${details.label} ${details.group}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      }),
  })).filter((group) => group.icons.length > 0);
}

/** The details for a stored icon name; a name this admin app doesn't know shows as the information icon. */
export function iconDetails(key: string): SectionIconDetails {
  // Own properties only: a name like "constructor" must not find something on Object.prototype.
  return Object.prototype.hasOwnProperty.call(SECTION_ICON_DETAILS, key)
    ? SECTION_ICON_DETAILS[key as EventInfoSectionIcon]
    : SECTION_ICON_DETAILS.info;
}
