// Email and phone links for More Info text. Web links must be https (see
// safe-url.ts); email and phone links are allowed too, but only in their plain
// form — a `mailto:` link can carry extra recipients, a subject or a body, and a
// `tel:` link can carry dial codes, so anything beyond the bare address or number
// is rejected. The mobile app adds the email subject itself (the event name).

const EMAIL = /^[A-Za-z0-9._+-]{1,64}@([A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/;
const MAX_EMAIL_LENGTH = 254;

export type ContactCheck = { ok: true; url: string; canonical: string } | { ok: false; error: string };

function fail(error: string): ContactCheck {
  return { ok: false, error };
}

/**
 * `mailto:name@example.com` — exactly one address. The result's `canonical` is
 * the lower-cased address.
 */
export function checkMailto(href: string): ContactCheck {
  const value = href.trim();
  if (!/^mailto:/i.test(value)) return fail("Email links must start with mailto:");
  const rest = value.slice("mailto:".length);
  if (rest.includes("?")) {
    return fail("Remove everything after the email address — the subject is filled in automatically with the event name.");
  }
  if (/[,;\s%<>"'\\]/.test(rest)) return fail("An email link can hold just one plain email address.");
  if (!rest || rest.length > MAX_EMAIL_LENGTH || !EMAIL.test(rest) || rest.includes("..")) {
    return fail(`"${rest.slice(0, 60)}" isn't a valid email address.`);
  }
  const [local, domain] = rest.split("@");
  const canonical = `${local}@${domain.toLowerCase()}`;
  return { ok: true, url: `mailto:${canonical}`, canonical };
}

/**
 * `tel:+15551234567` — digits, an optional leading +, and spaces, dashes,
 * dots or brackets for readability (removed in the result). Dial codes such as
 * pauses, extensions, # and * are rejected. The result's `canonical` is the digits.
 */
export function checkTel(href: string): ContactCheck {
  const value = href.trim();
  if (!/^tel:/i.test(value)) return fail("Phone links must start with tel:");
  const rest = value.slice("tel:".length).trim();
  if (!/^\+?[0-9 ().-]+$/.test(rest)) return fail("A phone link can hold just a phone number (digits, and an optional + at the start).");
  const digits = rest.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 15) return fail("A phone number needs between 3 and 15 digits.");
  const canonical = `${rest.startsWith("+") ? "+" : ""}${digits}`;
  return { ok: true, url: `tel:${canonical}`, canonical };
}

/** Looks like an email address (used to catch link text that pretends to be one). */
export function looksLikeEmail(text: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text.trim());
}

/** Looks like a phone number: mostly digits, at least 7 of them. */
export function looksLikePhone(text: string): boolean {
  const t = text.trim();
  return /^\+?[0-9 ().-]+$/.test(t) && t.replace(/\D/g, "").length >= 7;
}
