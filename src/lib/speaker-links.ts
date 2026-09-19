// The optional links a speaker can have. One list drives the database
// column mapping, the admin form inputs, and reading the submitted form,
// so adding a platform is a one-line change here (plus a migration and
// the mobile app's SOCIAL_PLATFORMS).
export const SPEAKER_LINK_FIELDS = [
  { key: "websiteUrl", column: "website_url", label: "Website", placeholder: "example.com" },
  { key: "instagram", column: "instagram", label: "Instagram", placeholder: "Handle or full URL" },
  { key: "facebook", column: "facebook", label: "Facebook", placeholder: "Handle or full URL" },
  { key: "youtube", column: "youtube", label: "YouTube", placeholder: "Handle or full URL" },
  { key: "tiktok", column: "tiktok", label: "TikTok", placeholder: "Handle or full URL" },
  { key: "patreon", column: "patreon", label: "Patreon", placeholder: "Handle or full URL" },
  { key: "twitch", column: "twitch", label: "Twitch", placeholder: "Handle or full URL" },
  { key: "discord", column: "discord", label: "Discord", placeholder: "Invite code or full URL" },
  { key: "skool", column: "skool", label: "Skool", placeholder: "Community name or full URL" },
] as const;

export type SpeakerLinkKey = (typeof SPEAKER_LINK_FIELDS)[number]["key"];

/** A speaker's links; null means "not set". */
export type SpeakerLinks = Record<SpeakerLinkKey, string | null>;

/** Reads every link input from a submitted speaker form (blank stays "" and is nulled by the service). */
export function readSpeakerLinks(formData: FormData): Record<SpeakerLinkKey, string> {
  const links = {} as Record<SpeakerLinkKey, string>;
  for (const { key } of SPEAKER_LINK_FIELDS) {
    links[key] = String(formData.get(key) ?? "");
  }
  return links;
}
