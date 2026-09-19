import { describe, expect, it } from "vitest";
import { findBadLink } from "./markdown-links";

describe("findBadLink", () => {
  it.each([
    "",
    "Plain text with no links.",
    "# Heading\n\n**Bold** text and a [link](https://example.com/page?x=1).",
    "Leave a review on [G2](https://www.g2.com/products/x) or [Gartner Peer Insights](https://www.gartner.com/reviews).",
    "[example.com](https://example.com)",
    "[www.example.com](https://example.com/about)", // same site, www ignored
    "[Click here](https://example.com)",
    "Two links: [a](https://a.example.com) and [b](https://b.example.com).",
    "A bare URL is just text: https://example.com",
  ])("accepts %j", (body) => {
    expect(findBadLink(body)).toBeNull();
  });

  it.each([
    ["http link", "[a](http://example.com)"],
    ["javascript link", "[a](javascript:alert(1))"],
    ["data link", "[a](data:text/html,<script>alert(1)</script>)"],
    ["mailto link", "[a](mailto:x@example.com)"],
    ["relative link", "[a](/admin)"],
    ["protocol-relative link", "[a](//evil.example.com)"],
    ["empty link", "[a]()"],
    ["credentials", "[a](https://user:pass@example.com)"],
    ["IP address", "[a](https://192.168.0.1/admin)"],
    ["localhost", "[a](https://localhost:3000)"],
    ["custom port", "[a](https://example.com:8443)"],
    ["link with a title (spaces)", '[a](https://example.com "title")'],
    ["image with a bad source", "![alt](javascript:alert(1))"],
    ["bad link after a good one", "[ok](https://example.com) then [bad](http://evil.example.com)"],
  ])("rejects %s", (_name, body) => {
    expect(findBadLink(body)).not.toBeNull();
  });

  it("rejects link text that names a different site than the destination", () => {
    const problem = findBadLink("[paypal.com](https://evil.example.com/login)");
    expect(problem).toContain("looks like a different web address");
  });

  it("rejects link text that is a full URL to a different site", () => {
    expect(findBadLink("[https://mybank.com](https://evil.example.com)")).not.toBeNull();
  });

  it("names the offending link in the message", () => {
    expect(findBadLink("[a](http://example.com/x)")).toBe(
      'Link "http://example.com/x": Links must start with https://',
    );
  });
});
