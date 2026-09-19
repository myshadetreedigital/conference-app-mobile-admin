import { describe, expect, it } from "vitest";
import { checkMailto, checkTel, looksLikeEmail, looksLikePhone } from "./contact-links";

describe("checkMailto", () => {
  it("accepts one plain address and lower-cases the domain", () => {
    expect(checkMailto("mailto:info@example.com")).toEqual({ ok: true, url: "mailto:info@example.com", canonical: "info@example.com" });
    expect(checkMailto(" MAILTO:Jane.Doe+events@Example.CO.UK ")).toEqual({
      ok: true,
      url: "mailto:Jane.Doe+events@example.co.uk",
      canonical: "Jane.Doe+events@example.co.uk",
    });
  });

  it("explains that the subject is added automatically", () => {
    const result = checkMailto("mailto:a@example.com?subject=Hello");
    expect(!result.ok && result.error).toContain("subject is filled in automatically");
  });

  it.each([
    "mailto:a@example.com?cc=b@example.com",
    "mailto:a@example.com?body=hi",
    "mailto:a@example.com,b@example.com",
    "mailto:a@example.com;b@example.com",
    "mailto:a@example.com b@example.com",
    "mailto:a@example.com%0Abcc:evil@example.com",
    "mailto:<a@example.com>",
    'mailto:"a"@example.com',
    "mailto:a@example",
    "mailto:@example.com",
    "mailto:a@@example.com",
    "mailto:a@exa..mple.com",
    "mailto:a@example.c",
    "mailto:",
    "mailto",
    "https://example.com",
    `mailto:${"a".repeat(65)}@example.com`,
    `mailto:a@${"b".repeat(250)}.com`,
  ])("rejects %j", (href) => {
    expect(checkMailto(href).ok).toBe(false);
  });
});

describe("checkTel", () => {
  it.each([
    ["tel:+15551234567", "+15551234567"],
    ["tel:+1 (555) 123-4567", "+15551234567"],
    ["tel:555.123.4567", "5551234567"],
    ["tel:911", "911"],
    [" TEL:+44 20 7946 0958 ", "+442079460958"],
  ])("accepts %j as %s", (href, canonical) => {
    expect(checkTel(href)).toEqual({ ok: true, url: `tel:${canonical}`, canonical });
  });

  it.each([
    "tel:+1555;ext=1",
    "tel:555,1234",
    "tel:*67",
    "tel:#31#5551234567",
    "tel:5551234567p12",
    "tel:12",
    "tel:+1234567890123456",
    "tel:abc",
    "tel:",
    "tel:1+555",
    "sms:+15551234567",
    "https://example.com",
  ])("rejects %j", (href) => {
    expect(checkTel(href).ok).toBe(false);
  });
});

describe("looksLike", () => {
  it("recognises email-shaped and phone-shaped text", () => {
    expect(looksLikeEmail("boss@company.com")).toBe(true);
    expect(looksLikeEmail("email us")).toBe(false);
    expect(looksLikePhone("+1 (555) 123-4567")).toBe(true);
    expect(looksLikePhone("555-1234")).toBe(true);
    expect(looksLikePhone("Level 4")).toBe(false);
    expect(looksLikePhone("2026")).toBe(false);
    expect(looksLikePhone("Call")).toBe(false);
  });
});
