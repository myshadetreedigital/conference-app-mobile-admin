// Standard checks for any link an admin can enter that ends up in front of
// attendees. HTTPS only, and nothing that could point at the reader's own
// device or network, smuggle credentials, or hide the real host.

export const MAX_URL_LENGTH = 2048;

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const HOST_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
// Reserved / non-public suffixes (RFC 2606, 6761, 6762) and common
// intranet names — never a legitimate public link.
const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".corp", ".test", ".invalid"];

function fail(error: string): UrlCheck {
  return { ok: false, error };
}

/** Parses and vets a link. Accepts only a complete `https://` URL. */
export function checkHttpsUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return fail("Enter a link.");
  if (value.length > MAX_URL_LENGTH) return fail("That link is too long.");
  if (/[\u0000-\u001F\u007F\s\\]/.test(value)) {
    return fail("Links can't contain spaces, backslashes, or control characters.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("That isn't a valid link.");
  }

  if (url.protocol !== "https:") return fail("Links must start with https://");
  if (url.username || url.password) return fail("Links can't contain a username or password.");
  // The URL parser drops the default port, so any port left is non-standard.
  if (url.port) return fail("Links can't use a custom port.");

  const host = url.hostname.toLowerCase();
  // The parser normalises hex/octal/decimal IPv4 forms (0x7f.1, 2130706433)
  // to dotted decimal, so this one check covers them all.
  if (host.startsWith("[") || IPV4.test(host)) return fail("Links can't point to an IP address.");
  if (!host.includes(".") || host.endsWith(".")) return fail("That link's web address isn't valid.");
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return fail("That link's web address isn't valid.");

  const labels = host.split(".");
  if (!labels.every((l) => HOST_LABEL.test(l) || l.startsWith("xn--")) || !TLD.test(labels[labels.length - 1])) {
    return fail("That link's web address isn't valid.");
  }

  return { ok: true, url };
}

/**
 * For a link typed by a person: "example.com/about" is treated as
 * https://example.com/about, but an explicit non-https scheme
 * (http:, javascript:, data:, mailto:, ...) is rejected rather than rewritten.
 */
export function checkWebsite(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return fail("Enter a link.");
  if (/^https:\/\//i.test(value)) return checkHttpsUrl(value);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fail("Links must start with https://");
  return checkHttpsUrl(`https://${value}`);
}
