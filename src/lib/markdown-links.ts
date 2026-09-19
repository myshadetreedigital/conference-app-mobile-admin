import { checkHttpsUrl, checkWebsite } from "@/lib/safe-url";

// Section text (the More Info pages) allows a small Markdown subset:
// **bold**, [link text](https://…), # headings, blank lines between
// paragraphs. Links are the only part that can send an attendee somewhere,
// so every one is checked when the admin saves. The mobile app renders this
// subset itself and re-checks each link when it is tapped.

export const MAX_SECTION_BODY_LENGTH = 10_000;

const hostWithoutWww = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, "");

/**
 * Returns a message describing the first bad link in a section body, or
 * null if every link is acceptable. Rules: https only, the standard URL
 * safety checks (see safe-url.ts), and link text that itself looks like a
 * web address must point at that same site — so "[paypal.com](https://evil.example)"
 * can't pass for a trusted link.
 */
export function findBadLink(body: string): string | null {
  for (const match of body.matchAll(/\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g)) {
    const text = match[1].trim();
    const target = match[2].trim();

    const checked = checkHttpsUrl(target);
    if (!checked.ok) return `Link "${target.slice(0, 60)}": ${checked.error}`;

    const shown = checkWebsite(text);
    if (shown.ok && hostWithoutWww(shown.url) !== hostWithoutWww(checked.url)) {
      return `The link text "${text.slice(0, 60)}" looks like a different web address than where it goes.`;
    }
  }
  return null;
}
