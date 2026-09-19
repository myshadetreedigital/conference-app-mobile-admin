import { describe, expect, it } from "vitest";
import { normalizeSpeakerLink, readSpeakerLinks, SPEAKER_LINK_FIELDS, type SpeakerLinkKey } from "./speaker-links";

function stored(key: SpeakerLinkKey, raw: string | null | undefined): string | null {
  const result = normalizeSpeakerLink(key, raw);
  if (!result.ok) throw new Error(`expected ${JSON.stringify(raw)} to be valid for ${key}: ${result.error}`);
  return result.value;
}

function rejected(key: SpeakerLinkKey, raw: string): boolean {
  return !normalizeSpeakerLink(key, raw).ok;
}

describe("blank values", () => {
  it.each([null, undefined, "", "   "])("%j stores null for every field", (value) => {
    for (const { key } of SPEAKER_LINK_FIELDS) {
      expect(stored(key, value)).toBeNull();
    }
  });
});

describe("website", () => {
  it("normalises a bare domain to https", () => {
    expect(stored("websiteUrl", "example.com")).toBe("https://example.com/");
    expect(stored("websiteUrl", "https://example.com/talks?x=1")).toBe("https://example.com/talks?x=1");
  });

  it.each(["http://example.com", "javascript:alert(1)", "https://127.0.0.1", "https://user:p@example.com", "nodots"])(
    "rejects %j",
    (value) => {
      expect(rejected("websiteUrl", value)).toBe(true);
    },
  );

  it("names the field in the error", () => {
    const result = normalizeSpeakerLink("websiteUrl", "http://example.com");
    expect(!result.ok && result.error).toBe("Website: Links must start with https://");
  });
});

// [input, canonical stored value]
const VALID: Record<Exclude<SpeakerLinkKey, "websiteUrl">, [string, string][]> = {
  instagram: [
    ["jane", "https://www.instagram.com/jane"],
    ["@Jane.Doe_1", "https://www.instagram.com/jane.doe_1"],
    ["https://www.instagram.com/jane/", "https://www.instagram.com/jane"],
    ["https://instagram.com/jane?igsh=abc123&utm_source=x", "https://www.instagram.com/jane"],
    ["instagram.com/jane", "https://www.instagram.com/jane"],
  ],
  facebook: [
    ["jane.doe", "https://www.facebook.com/jane.doe"],
    ["https://m.facebook.com/JaneDoe1", "https://www.facebook.com/janedoe1"],
    ["https://www.facebook.com/profile.php?id=100012345678901", "https://www.facebook.com/profile.php?id=100012345678901"],
    ["https://facebook.com/people/Jane-Doe/100012345678901/", "https://www.facebook.com/people/Jane-Doe/100012345678901"],
  ],
  youtube: [
    ["@janedoe", "https://www.youtube.com/@janedoe"],
    ["janedoe", "https://www.youtube.com/@janedoe"],
    ["https://www.youtube.com/@Jane.Doe", "https://www.youtube.com/@Jane.Doe"],
    ["https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv", "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"],
    ["https://youtube.com/c/JaneDoeTalks", "https://www.youtube.com/c/JaneDoeTalks"],
    ["https://youtube.com/user/janedoe", "https://www.youtube.com/user/janedoe"],
  ],
  tiktok: [
    ["jane", "https://www.tiktok.com/@jane"],
    ["@Jane_Doe.1", "https://www.tiktok.com/@jane_doe.1"],
    ["https://www.tiktok.com/@jane?lang=en", "https://www.tiktok.com/@jane"],
  ],
  linkedin: [
    ["jane-doe-123", "https://www.linkedin.com/in/jane-doe-123"],
    ["https://www.linkedin.com/in/Jane-Doe/", "https://www.linkedin.com/in/jane-doe"],
    ["https://uk.linkedin.com/in/jane-doe?trk=x", "https://www.linkedin.com/in/jane-doe"],
    ["https://linkedin.com/company/acme-events", "https://www.linkedin.com/company/acme-events"],
  ],
  patreon: [
    ["janedoe", "https://www.patreon.com/c/janedoe"],
    ["https://www.patreon.com/c/janedoe", "https://www.patreon.com/c/janedoe"],
    ["https://patreon.com/janedoe", "https://www.patreon.com/c/janedoe"],
    ["https://www.patreon.com/user?u=12345678", "https://www.patreon.com/user?u=12345678"],
  ],
  twitch: [
    ["janelive", "https://www.twitch.tv/janelive"],
    ["@Jane_Live", "https://www.twitch.tv/jane_live"],
    ["https://www.twitch.tv/janelive/", "https://www.twitch.tv/janelive"],
  ],
  discord: [
    ["abc123", "https://discord.gg/abc123"],
    ["https://discord.gg/my-server", "https://discord.gg/my-server"],
    ["https://discord.com/invite/abc123", "https://discord.gg/abc123"],
    ["discord.gg/abc123", "https://discord.gg/abc123"],
  ],
};

describe.each(Object.entries(VALID))("%s accepts", (key, cases) => {
  it.each(cases)("%j -> %s", (input, expected) => {
    expect(stored(key as SpeakerLinkKey, input)).toBe(expected);
  });
});

const INVALID: Record<Exclude<SpeakerLinkKey, "websiteUrl">, string[]> = {
  instagram: [
    ".jane", "jane.", "ja..ne", "a".repeat(31), "jane doe", "jane!", "explore",
    "https://www.instagram.com/p/CxYz123/", "https://www.instagram.com/jane/reels/",
    "https://www.instagram.com/", "https://instagram.com/reel/abc",
  ],
  facebook: [
    "jane", "jane_doe", "a".repeat(51), "sharer", "https://www.facebook.com/sharer/sharer.php?u=x",
    "https://www.facebook.com/profile.php?id=abc", "https://www.facebook.com/profile.php",
    "https://www.facebook.com/groups/123456", "https://www.facebook.com/people/Jane/notanid",
  ],
  youtube: [
    "ab", "a".repeat(31), "-janedoe", "janedoe-", "jane doe",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/@janedoe/videos", "https://www.youtube.com/channel/notachannelid",
    "https://www.youtube.com/playlist?list=PL123",
  ],
  tiktok: [
    "a", "a".repeat(25), ".jane", "jane.", "jane-doe",
    "https://www.tiktok.com/@jane/video/7123456789", "https://vm.tiktok.com/ZM123/", "https://www.tiktok.com/jane",
  ],
  linkedin: [
    "ab", "jane_doe", "jane doe", "a".repeat(101),
    "https://www.linkedin.com/feed/", "https://www.linkedin.com/in/", "https://www.linkedin.com/in/jane/details/experience",
    "https://www.linkedin.com/posts/jane_activity-123", "https://notlinkedin.com/in/jane",
  ],
  patreon: [
    "a", "jane doe", "login", "c", "https://www.patreon.com/posts/some-post-12345",
    "https://www.patreon.com/c/", "https://www.patreon.com/user?u=abc", "https://www.patreon.com/c/jane/posts",
  ],
  twitch: [
    "abc", "_janelive", "jane-live", "a".repeat(26), "directory", "https://www.twitch.tv/videos/123456",
    "https://www.twitch.tv/janelive/about", "https://clips.twitch.tv/SomeClip",
  ],
  discord: [
    "a", "invite code", "abc_123", "https://discord.com/channels/123/456", "https://discord.gg/",
    "https://discord.com/invite/", "https://discord.gg/invite/abc123", "https://discord.com/abc123",
  ],
};

describe.each(Object.entries(INVALID))("%s rejects", (key, cases) => {
  it.each(cases)("%j", (input) => {
    expect(rejected(key as SpeakerLinkKey, input)).toBe(true);
  });
});

describe("security: every social platform rejects hostile input", () => {
  const social = SPEAKER_LINK_FIELDS.filter((f) => f.key !== "websiteUrl").map((f) => f.key);
  const platformHost: Record<string, string> = {
    instagram: "instagram.com", facebook: "facebook.com", youtube: "youtube.com", tiktok: "tiktok.com",
    linkedin: "linkedin.com", patreon: "patreon.com", twitch: "twitch.tv", discord: "discord.gg",
  };

  it.each(social)("%s", (key) => {
    const host = platformHost[key];
    const hostile = [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      `http://${host}/jane`, // plain http
      `https://${host}.evil.com/jane`, // look-alike suffix
      `https://evil.com/${host}/jane`, // real host only in the path
      `https://${host}@evil.com/jane`, // real host as credentials
      `https://user:pass@${host}/jane`,
      `https://${host}:8443/jane`,
      `https://not${host}/jane`,
      `https://${host}/jane\\..\\admin`,
      `https://${host}/ja ne`,
      "https://127.0.0.1/jane",
      "https://localhost/jane",
      "<script>alert(1)</script>",
      "jane\nhttps://evil.com",
      "'; DROP TABLE speakers; --",
    ];
    for (const value of hostile) {
      expect(rejected(key as SpeakerLinkKey, value), `${key} should reject ${JSON.stringify(value)}`).toBe(true);
    }
  });

  it.each(social)("%s stores only https URLs on its own host", (key) => {
    const host = platformHost[key];
    const samples = VALID[key as keyof typeof VALID].map(([input]) => stored(key as SpeakerLinkKey, input));
    for (const value of samples) {
      const url = new URL(value as string);
      expect(url.protocol).toBe("https:");
      expect(url.hostname.endsWith(host) || url.hostname === `www.${host}`).toBe(true);
      expect(url.username).toBe("");
    }
  });
});

describe("error messages name the platform", () => {
  it("bad handle", () => {
    const result = normalizeSpeakerLink("instagram", "jane doe");
    expect(!result.ok && result.error).toBe("Instagram: Enter a valid handle or a full https:// link.");
  });
  it("wrong site", () => {
    const result = normalizeSpeakerLink("linkedin", "https://evil.com/in/jane");
    expect(!result.ok && result.error).toBe("LinkedIn: That isn't a LinkedIn link.");
  });
  it("not a profile", () => {
    const result = normalizeSpeakerLink("twitch", "https://www.twitch.tv/videos/1");
    expect(!result.ok && result.error).toBe("Twitch: That doesn't look like a Twitch profile link.");
  });
  it("http", () => {
    const result = normalizeSpeakerLink("tiktok", "http://tiktok.com/@jane");
    expect(!result.ok && result.error).toBe("TikTok: Links must start with https://");
  });
});

describe("readSpeakerLinks", () => {
  it("reads every field from a form, blank when absent", () => {
    const form = new FormData();
    form.set("instagram", "jane");
    const links = readSpeakerLinks(form);
    expect(Object.keys(links)).toEqual(SPEAKER_LINK_FIELDS.map((f) => f.key));
    expect(links.instagram).toBe("jane");
    expect(links.linkedin).toBe("");
  });
});
