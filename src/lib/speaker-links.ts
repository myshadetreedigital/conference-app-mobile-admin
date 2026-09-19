import { checkHttpsUrl, checkWebsite } from "@/lib/safe-url";

// The optional links a speaker can have. One list drives the database
// column mapping, the admin form inputs, and reading the submitted form,
// so adding a platform is one entry here plus its rules in PLATFORMS below,
// a migration, and the mobile app's SOCIAL_PLATFORMS.
export const SPEAKER_LINK_FIELDS = [
  { key: "websiteUrl", column: "website_url", label: "Website", placeholder: "example.com or https://…" },
  { key: "instagram", column: "instagram", label: "Instagram", placeholder: "Handle or https:// link" },
  { key: "facebook", column: "facebook", label: "Facebook", placeholder: "Username or https:// link" },
  { key: "youtube", column: "youtube", label: "YouTube", placeholder: "@handle or https:// link" },
  { key: "tiktok", column: "tiktok", label: "TikTok", placeholder: "Handle or https:// link" },
  { key: "linkedin", column: "linkedin", label: "LinkedIn", placeholder: "Profile name or https:// link" },
  { key: "patreon", column: "patreon", label: "Patreon", placeholder: "Page name or https:// link" },
  { key: "twitch", column: "twitch", label: "Twitch", placeholder: "Username or https:// link" },
  { key: "discord", column: "discord", label: "Discord", placeholder: "Invite code or https:// link" },
] as const;

export type SpeakerLinkKey = (typeof SPEAKER_LINK_FIELDS)[number]["key"];
type SocialKey = Exclude<SpeakerLinkKey, "websiteUrl">;

/** A speaker's links; null means "not set". Stored values are canonical https:// URLs. */
export type SpeakerLinks = Record<SpeakerLinkKey, string | null>;

/** Reads every link input from a submitted speaker form (blank stays "" and is nulled by validation). */
export function readSpeakerLinks(formData: FormData): Record<SpeakerLinkKey, string> {
  const links = {} as Record<SpeakerLinkKey, string>;
  for (const { key } of SPEAKER_LINK_FIELDS) {
    links[key] = String(formData.get(key) ?? "");
  }
  return links;
}

// ---------------------------------------------------------------------
// Per-platform rules. Each platform accepts either a bare handle or a full
// https link, and always produces ONE canonical profile URL — tracking
// parameters, sub-pages (/reels, /videos) and look-alike hosts
// (instagram.com.evil.com) never survive. Hosts are matched exactly, never
// by suffix. Username rules are the platforms' published limits as of
// September 2026; when one changes, this table is the only place to edit.
// ---------------------------------------------------------------------

interface Platform {
  label: string;
  hostOk(host: string): boolean;
  /** Canonical URL for a link, or null if the path isn't a profile. `segs` are the decoded path segments. */
  fromUrl(url: URL, segs: string[]): string | null;
  /** Canonical URL for a bare handle, or null if it isn't a valid handle. */
  fromHandle(handle: string): string | null;
}

const exactHosts = (...hosts: string[]) => (host: string) => hosts.includes(host);
const stripAt = (s: string) => s.replace(/^@/, "");

// Instagram: 1–30 chars, letters/numbers/periods/underscores, no leading,
// trailing, or doubled periods.
const INSTAGRAM_RESERVED = new Set([
  "p", "reel", "reels", "stories", "explore", "accounts", "tv", "direct", "about", "legal", "developer",
]);
function instagramUser(raw: string): string | null {
  const n = stripAt(raw).toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(n) || n.startsWith(".") || n.endsWith(".") || n.includes("..")) return null;
  return INSTAGRAM_RESERVED.has(n) ? null : n;
}

// Facebook: username 5–50 chars, letters/numbers/periods; legacy
// profile.php?id=<digits>; and the /people/<name>/<id> form pages use.
const FACEBOOK_RESERVED = new Set([
  "sharer", "share", "dialog", "login", "groups", "events", "watch", "marketplace", "hashtag", "permalink.php",
  "photo", "photo.php", "story.php", "pages", "people", "profile.php", "plugins", "policies", "help", "settings",
  "gaming", "reel", "reels", "stories", "video", "videos", "business", "ads",
]);
function facebookUser(raw: string): string | null {
  const n = raw.toLowerCase();
  if (!/^[a-z0-9.]{5,50}$/.test(n) || n.startsWith(".") || n.endsWith(".")) return null;
  return FACEBOOK_RESERVED.has(n) ? null : n;
}

// YouTube: @handle of 3–30 chars (letters/numbers from any supported
// script, plus _ - . and the Latin middle dot), not starting or ending with
// a symbol. Legacy /channel/UC…, /c/<name> and /user/<name> still resolve.
function youtubeHandle(raw: string): string | null {
  const h = stripAt(raw);
  if (!/^[\p{L}\p{N}._\-·]{3,30}$/u.test(h)) return null;
  return /^[\p{L}\p{N}]/u.test(h) && /[\p{L}\p{N}]$/u.test(h) ? h : null;
}

// TikTok: 2–24 chars, letters/numbers/underscores/periods, no leading or
// trailing period.
function tiktokUser(raw: string): string | null {
  const n = stripAt(raw).toLowerCase();
  return /^[a-z0-9._]{2,24}$/.test(n) && !n.startsWith(".") && !n.endsWith(".") ? n : null;
}

// LinkedIn: /in/<slug> (people) or /company/<slug>; slug 3–100 chars of
// letters, numbers, and hyphens.
function linkedinSlug(raw: string): string | null {
  const n = raw.toLowerCase();
  return /^[\p{L}\p{N}-]{3,100}$/u.test(n) ? n : null;
}

// Patreon: creator pages live at /c/<vanity> (older /<vanity> links still
// work), or /user?u=<id> for pages without a vanity.
const PATREON_RESERVED = new Set([
  "c", "user", "login", "signup", "join", "home", "about", "explore", "settings", "posts", "api", "oauth2",
  "policy", "legal", "messages", "notifications", "checkout", "apps", "pricing", "creators", "logout", "search",
]);
function patreonVanity(raw: string): string | null {
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(raw)) return null;
  return PATREON_RESERVED.has(raw.toLowerCase()) ? null : raw;
}

// Twitch: 4–25 chars, letters/numbers/underscores, no leading underscore.
const TWITCH_RESERVED = new Set([
  "directory", "videos", "downloads", "jobs", "turbo", "store", "settings", "p", "subscriptions", "wallet",
  "friends", "messages", "drops", "prime", "login", "signup",
]);
function twitchUser(raw: string): string | null {
  const n = stripAt(raw).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_]{3,24}$/.test(n)) return null;
  return TWITCH_RESERVED.has(n) ? null : n;
}

// Discord: invite codes are letters, numbers, and hyphens (custom vanity
// codes up to 25 chars, generated ones ~7–10). discord.gg/<code> is the
// canonical form; discord.com/invite/<code> is the same thing.
function discordCode(raw: string): string | null {
  return /^[A-Za-z0-9-]{2,32}$/.test(raw) ? raw : null;
}

const PLATFORMS: Record<SocialKey, Platform> = {
  instagram: {
    label: "Instagram",
    hostOk: exactHosts("instagram.com", "www.instagram.com"),
    fromUrl: (_url, segs) => {
      const u = segs.length === 1 ? instagramUser(segs[0]) : null;
      return u && `https://www.instagram.com/${u}`;
    },
    fromHandle: (h) => {
      const u = instagramUser(h);
      return u && `https://www.instagram.com/${u}`;
    },
  },
  facebook: {
    label: "Facebook",
    hostOk: exactHosts("facebook.com", "www.facebook.com", "m.facebook.com"),
    fromUrl: (url, segs) => {
      if (segs.length === 1 && segs[0] === "profile.php") {
        const id = url.searchParams.get("id") ?? "";
        return /^\d{5,20}$/.test(id) ? `https://www.facebook.com/profile.php?id=${id}` : null;
      }
      if (segs.length === 3 && segs[0] === "people") {
        return /^[\p{L}\p{N}._-]{1,100}$/u.test(segs[1]) && /^\d{5,20}$/.test(segs[2])
          ? `https://www.facebook.com/people/${encodeURIComponent(segs[1])}/${segs[2]}`
          : null;
      }
      const u = segs.length === 1 ? facebookUser(segs[0]) : null;
      return u && `https://www.facebook.com/${u}`;
    },
    fromHandle: (h) => {
      const u = facebookUser(h);
      return u && `https://www.facebook.com/${u}`;
    },
  },
  youtube: {
    label: "YouTube",
    hostOk: exactHosts("youtube.com", "www.youtube.com", "m.youtube.com"),
    fromUrl: (_url, segs) => {
      if (segs.length === 1 && segs[0].startsWith("@")) {
        const h = youtubeHandle(segs[0]);
        return h && `https://www.youtube.com/@${encodeURIComponent(h)}`;
      }
      if (segs.length === 2 && segs[0] === "channel") {
        return /^UC[A-Za-z0-9_-]{22}$/.test(segs[1]) ? `https://www.youtube.com/channel/${segs[1]}` : null;
      }
      if (segs.length === 2 && (segs[0] === "c" || segs[0] === "user")) {
        return /^[A-Za-z0-9._-]{1,100}$/.test(segs[1]) ? `https://www.youtube.com/${segs[0]}/${segs[1]}` : null;
      }
      return null;
    },
    fromHandle: (h) => {
      const handle = youtubeHandle(h);
      return handle && `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    },
  },
  tiktok: {
    label: "TikTok",
    hostOk: exactHosts("tiktok.com", "www.tiktok.com"),
    fromUrl: (_url, segs) => {
      const u = segs.length === 1 && segs[0].startsWith("@") ? tiktokUser(segs[0]) : null;
      return u && `https://www.tiktok.com/@${u}`;
    },
    fromHandle: (h) => {
      const u = tiktokUser(h);
      return u && `https://www.tiktok.com/@${u}`;
    },
  },
  linkedin: {
    label: "LinkedIn",
    // Country sites (uk.linkedin.com, de.linkedin.com, ...) share the same paths.
    hostOk: (host) => host === "linkedin.com" || host === "www.linkedin.com" || /^[a-z]{2}\.linkedin\.com$/.test(host),
    fromUrl: (_url, segs) => {
      if (segs.length !== 2 || (segs[0] !== "in" && segs[0] !== "company")) return null;
      const slug = linkedinSlug(segs[1]);
      return slug && `https://www.linkedin.com/${segs[0]}/${encodeURIComponent(slug)}`;
    },
    fromHandle: (h) => {
      const slug = linkedinSlug(h);
      return slug && `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
    },
  },
  patreon: {
    label: "Patreon",
    hostOk: exactHosts("patreon.com", "www.patreon.com"),
    fromUrl: (url, segs) => {
      if (segs.length === 1 && segs[0] === "user") {
        const id = url.searchParams.get("u") ?? "";
        return /^\d{1,20}$/.test(id) ? `https://www.patreon.com/user?u=${id}` : null;
      }
      const vanity = segs.length === 2 && segs[0] === "c" ? patreonVanity(segs[1]) : segs.length === 1 ? patreonVanity(segs[0]) : null;
      return vanity && `https://www.patreon.com/c/${vanity}`;
    },
    fromHandle: (h) => {
      const vanity = patreonVanity(h);
      return vanity && `https://www.patreon.com/c/${vanity}`;
    },
  },
  twitch: {
    label: "Twitch",
    hostOk: exactHosts("twitch.tv", "www.twitch.tv", "m.twitch.tv"),
    fromUrl: (_url, segs) => {
      const u = segs.length === 1 ? twitchUser(segs[0]) : null;
      return u && `https://www.twitch.tv/${u}`;
    },
    fromHandle: (h) => {
      const u = twitchUser(h);
      return u && `https://www.twitch.tv/${u}`;
    },
  },
  discord: {
    label: "Discord",
    hostOk: exactHosts("discord.gg", "discord.com", "www.discord.com", "discordapp.com", "www.discordapp.com"),
    fromUrl: (url, segs) => {
      const host = url.hostname.toLowerCase();
      const code =
        host === "discord.gg" && segs.length === 1
          ? discordCode(segs[0])
          : host !== "discord.gg" && segs.length === 2 && segs[0] === "invite"
            ? discordCode(segs[1])
            : null;
      return code && `https://discord.gg/${code}`;
    },
    fromHandle: (h) => {
      const code = discordCode(h);
      return code && `https://discord.gg/${code}`;
    },
  },
};

/** Decoded, non-empty path segments; null if the path holds anything suspicious. */
function pathSegments(url: URL): string[] | null {
  try {
    const segs = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    return segs.some((s) => /[\u0000-\u001F\u007F/\\]/.test(s)) ? null : segs;
  } catch {
    return null;
  }
}

export type LinkResult = { ok: true; value: string | null } | { ok: false; error: string };

/**
 * Validates one speaker link and returns what should be stored: null for
 * blank, otherwise a canonical https:// URL. Accepts a bare handle or a full
 * https link for social platforms, and a domain or https link for websites.
 */
export function normalizeSpeakerLink(key: SpeakerLinkKey, raw: string | null | undefined): LinkResult {
  const value = raw?.trim() ?? "";
  if (!value) return { ok: true, value: null };

  if (key === "websiteUrl") {
    const checked = checkWebsite(value);
    return checked.ok ? { ok: true, value: checked.url.href } : { ok: false, error: `Website: ${checked.error}` };
  }

  const platform = PLATFORMS[key];
  const fail = (message: string): LinkResult => ({ ok: false, error: `${platform.label}: ${message}` });

  // Handles never contain "/" or ":", so anything that does is treated as a link.
  if (/[/:]/.test(value) || /^www\./i.test(value)) {
    let candidate: string;
    if (/^https:\/\//i.test(value)) candidate = value;
    else if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fail("Links must start with https://");
    else candidate = `https://${value}`;

    const checked = checkHttpsUrl(candidate);
    if (!checked.ok) return fail(checked.error);
    if (!platform.hostOk(checked.url.hostname.toLowerCase())) return fail(`That isn't a ${platform.label} link.`);

    const segs = pathSegments(checked.url);
    const canonical = segs && platform.fromUrl(checked.url, segs);
    return canonical ? { ok: true, value: canonical } : fail(`That doesn't look like a ${platform.label} profile link.`);
  }

  const canonical = platform.fromHandle(value);
  return canonical ? { ok: true, value: canonical } : fail("Enter a valid handle or a full https:// link.");
}
