import { describe, expect, it } from "vitest";
import { checkHttpsUrl, checkWebsite, MAX_URL_LENGTH } from "./safe-url";

describe("checkHttpsUrl", () => {
  it.each([
    "https://example.com",
    "https://example.com/about?x=1#top",
    "https://sub.example.co.uk/a/b",
    "https://EXAMPLE.com/Path",
    "https://xn--bcher-kva.example/",
    "  https://example.com  ",
  ])("accepts %j", (value) => {
    expect(checkHttpsUrl(value).ok).toBe(true);
  });

  it("returns the parsed URL", () => {
    const result = checkHttpsUrl("https://Example.com/a");
    expect(result.ok && result.url.href).toBe("https://example.com/a");
  });

  it.each([
    ["http scheme", "http://example.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["data scheme", "data:text/html,<script>alert(1)</script>"],
    ["file scheme", "file:///etc/passwd"],
    ["ftp scheme", "ftp://example.com"],
    ["mailto", "mailto:a@example.com"],
    ["tel", "tel:+15555550100"],
    ["protocol-relative", "//example.com"],
    ["no scheme", "example.com"],
    ["empty", ""],
    ["whitespace only", "   "],
  ])("rejects %s", (_name, value) => {
    expect(checkHttpsUrl(value).ok).toBe(false);
  });

  it.each([
    ["credentials", "https://user:pass@example.com"],
    ["username only", "https://user@example.com"],
    ["look-alike host via @", "https://instagram.com@evil.com/jane"],
    ["custom port", "https://example.com:8443/"],
    ["explicit http port", "https://example.com:80/"],
    ["space in URL", "https://example.com/a b"],
    ["tab in URL", "https://example.com/a\tb"],
    ["newline in URL", "https://example.com/a\nb"],
    ["backslash", "https://example.com\\@evil.com"],
    ["null byte", "https://example.com/\u0000"],
  ])("rejects %s", (_name, value) => {
    expect(checkHttpsUrl(value).ok).toBe(false);
  });

  it.each([
    ["IPv4", "https://93.184.216.34/"],
    ["loopback", "https://127.0.0.1/"],
    ["private range", "https://192.168.1.1/"],
    ["cloud metadata", "https://169.254.169.254/latest/meta-data"],
    ["hex IPv4", "https://0x7f.0.0.1/"],
    ["decimal IPv4", "https://2130706433/"],
    ["octal IPv4", "https://0177.0.0.1/"],
    ["IPv6", "https://[::1]/"],
    ["localhost", "https://localhost/"],
    ["single-label host", "https://intranet/"],
    [".local", "https://printer.local/"],
    [".internal", "https://db.internal/"],
    ["trailing dot", "https://example.com./"],
    ["numeric tld", "https://example.123/"],
    ["leading-hyphen label", "https://-bad.example.com/"],
  ])("rejects a non-public host: %s", (_name, value) => {
    expect(checkHttpsUrl(value).ok).toBe(false);
  });

  it("explains why an IP address was rejected", () => {
    for (const value of ["https://93.184.216.34/", "https://0x7f.0.0.1/", "https://[::1]/"]) {
      const result = checkHttpsUrl(value);
      expect(!result.ok && result.error).toBe("Links can't point to an IP address.");
    }
  });

  it("rejects links over the length limit", () => {
    const long = `https://example.com/${"a".repeat(MAX_URL_LENGTH)}`;
    expect(checkHttpsUrl(long).ok).toBe(false);
  });

  it("gives an error message on failure", () => {
    const result = checkHttpsUrl("http://example.com");
    expect(!result.ok && result.error).toBe("Links must start with https://");
  });
});

describe("checkWebsite", () => {
  it("adds https to a bare domain or path", () => {
    const a = checkWebsite("example.com");
    const b = checkWebsite("  example.com/about ");
    expect(a.ok && a.url.href).toBe("https://example.com/");
    expect(b.ok && b.url.href).toBe("https://example.com/about");
  });

  it("keeps a full https link", () => {
    const result = checkWebsite("https://example.com/x?y=1");
    expect(result.ok && result.url.href).toBe("https://example.com/x?y=1");
  });

  it.each([
    "http://example.com",
    "HTTP://example.com",
    "javascript:alert(1)",
    "data:text/html,x",
    "mailto:a@example.com",
    "ftp://example.com",
    "example.com:8080/x",
    "nodots",
    "",
    "https://127.0.0.1",
  ])("rejects %j without rewriting it", (value) => {
    expect(checkWebsite(value).ok).toBe(false);
  });
});
