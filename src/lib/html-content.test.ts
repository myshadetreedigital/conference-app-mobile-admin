import { describe, expect, it } from "vitest";
import { normalizeHtmlContent } from "./html-content";

function ok(input: string): string {
  const result = normalizeHtmlContent(input);
  if (!result.ok) throw new Error(`expected ${JSON.stringify(input)} to be accepted: ${result.errors.join(" | ")}`);
  return result.html;
}

function errors(input: string): string[] {
  const result = normalizeHtmlContent(input);
  if (result.ok) throw new Error(`expected ${JSON.stringify(input)} to be rejected, got ${JSON.stringify(result.html)}`);
  return result.errors;
}

describe("empty and plain text", () => {
  it.each(["", "   ", "\n\n \t\n"])("%j is fine and stores nothing", (input) => {
    expect(ok(input)).toBe("");
  });

  it("turns plain text into a paragraph, escaping special characters", () => {
    expect(ok("Hello there")).toBe("<p>Hello there</p>");
    expect(ok("Tom & Jerry <3 a > b")).toBe("<p>Tom &amp; Jerry &lt;3 a &gt; b</p>");
  });

  it("starts a new paragraph at a blank line and a <br> at a single line break", () => {
    expect(ok("First line\nsecond line\n\nNext paragraph")).toBe("<p>First line<br>second line</p>\n\n<p>Next paragraph</p>");
    expect(ok("a\r\n\r\nb")).toBe("<p>a</p>\n\n<p>b</p>");
  });

  it("keeps loose text and inline tags together in one paragraph", () => {
    expect(ok("Hello <b>brave</b> new <em>world</em>")).toBe("<p>Hello <strong>brave</strong> new <em>world</em></p>");
  });

  it("puts loose text around a block into its own paragraphs", () => {
    expect(ok("Intro\n<h2>Title</h2>\nOutro")).toBe("<p>Intro</p>\n\n<h2>Title</h2>\n\n<p>Outro</p>");
  });
});

describe("allowed tags", () => {
  it("accepts paragraphs and all six heading levels", () => {
    expect(ok("<p>One</p><p>Two</p>")).toBe("<p>One</p>\n\n<p>Two</p>");
    for (let n = 1; n <= 6; n++) expect(ok(`<h${n}>Title</h${n}>`)).toBe(`<h${n}>Title</h${n}>`);
  });

  it("accepts numbered lists", () => {
    expect(ok("<ol><li>One</li><li>Two <b>bold</b></li></ol>")).toBe("<ol>\n<li>One</li>\n<li>Two <strong>bold</strong></li>\n</ol>");
  });

  it("writes bold as <strong> and italic as <em>, whichever form was typed", () => {
    expect(ok("<p><b>a</b> <strong>b</strong> <i>c</i> <em>d</em></p>")).toBe("<p><strong>a</strong> <strong>b</strong> <em>c</em> <em>d</em></p>");
  });

  it("accepts <br> in any spelling", () => {
    expect(ok("<p>a<br>b<br/>c<BR />d</p>")).toBe("<p>a<br>b<br>c<br>d</p>");
  });

  it("is case-insensitive about tag names", () => {
    expect(ok("<P>Hi</P><H2>There</H2><STRONG>x</STRONG>")).toBe("<p>Hi</p>\n\n<h2>There</h2>\n\n<p><strong>x</strong></p>");
  });

  it("collapses whitespace inside tags, as HTML does", () => {
    expect(ok("<p>  lots \n of   space  </p>")).toBe("<p>lots of space</p>");
  });

  it("nests formatting and allows a link inside bold", () => {
    expect(ok('<p><strong><em>both</em> and <a href="https://example.com">a link</a></strong></p>')).toBe(
      '<p><strong><em>both</em> and <a href="https://example.com/">a link</a></strong></p>',
    );
  });

  it("drops empty elements and comments", () => {
    expect(ok("<p></p><h2>  </h2><p>Keep <strong></strong>me</p><!-- note --><ol></ol>")).toBe("<p>Keep me</p>");
  });

  it("decodes entities in the input and re-escapes them in the output", () => {
    expect(ok("<p>Tom &amp; Jerry &lt;script&gt;alert(1)&lt;/script&gt; &copy;</p>")).toBe(
      "<p>Tom &amp; Jerry &lt;script&gt;alert(1)&lt;/script&gt; ©</p>",
    );
  });
});

describe("tags that aren't allowed", () => {
  it.each([
    "div", "span", "ul", "u", "s", "sub", "sup", "small", "big", "font", "center", "pre", "code", "blockquote", "hr",
    "table", "tr", "td", "img", "picture", "svg", "video", "audio", "iframe", "frame", "object", "embed", "form",
    "input", "button", "select", "textarea", "label", "script", "style", "link", "meta", "base", "title", "head",
    "body", "html", "noscript", "template", "canvas", "map", "area", "dl", "dt", "dd", "nav", "section", "article",
  ])("rejects <%s> and names it", (tag) => {
    const problems = errors(`<${tag}>content</${tag}>`);
    expect(problems.join(" ")).toContain(`<${tag}>`);
  });

  it("lists what is allowed in the error", () => {
    expect(errors("<div>x</div>")[0]).toContain("<a>, <h1>–<h6>, <p>, <ol>, <li>, <strong>, <b>, <em>, <i>, <br>");
  });

  it("does not let a disallowed tag hide inside an allowed one", () => {
    expect(errors("<p>fine <span>not fine</span></p>").join(" ")).toContain("<span>");
    expect(errors("<ol><li><img src=x></li></ol>").join(" ")).toContain("<img>");
    expect(errors('<a href="https://example.com"><img src=x>logo</a>').join(" ")).toContain("<img>");
  });

  it("rejects doctype and CDATA-style markup", () => {
    expect(errors("<!DOCTYPE html><p>x</p>").length).toBeGreaterThan(0);
  });

  it("reports several problems at once, without repeating one", () => {
    const problems = errors("<div>a</div><div>b</div><span>c</span>");
    expect(problems).toHaveLength(2);
  });
});

describe("attributes", () => {
  it.each([
    ["class", '<p class="x">a</p>'],
    ["style", '<p style="color:red">a</p>'],
    ["onclick", '<p onclick="alert(1)">a</p>'],
    ["onmouseover", '<strong onmouseover="alert(1)">a</strong>'],
    ["id", '<h2 id="x">a</h2>'],
    ["title", '<a href="https://example.com" title="t">a</a>'],
    ["target", '<a href="https://example.com" target="_blank">a</a>'],
    ["rel", '<a href="https://example.com" rel="noopener">a</a>'],
    ["href", '<p href="https://example.com">a</p>'],
    ["style", "<br style=x>"],
    ["data-x", '<li data-x="1">a</li>'],
  ])("rejects the %s attribute", (name, html) => {
    const input = html.includes("<li") ? `<ol>${html}</ol>` : html;
    expect(errors(input).join(" ")).toContain(`"${name}"`);
  });
});

describe("links", () => {
  const link = (href: string, text = "a link") => `<p><a href="${href}">${text}</a></p>`;

  it("accepts https links and writes the canonical address", () => {
    expect(ok(link("https://Example.com/path?x=1&y=2"))).toBe('<p><a href="https://example.com/path?x=1&amp;y=2">a link</a></p>');
  });

  it("accepts an email link, lower-casing the domain", () => {
    expect(ok(link("mailto:Info@Example.COM", "Email us"))).toBe('<p><a href="mailto:Info@example.com">Email us</a></p>');
  });

  it("accepts a phone link and removes the separators", () => {
    expect(ok(link("tel:+1 (555) 123-4567", "Call us"))).toBe('<p><a href="tel:+15551234567">Call us</a></p>');
    expect(ok(link("tel:911", "Emergency"))).toBe('<p><a href="tel:911">Emergency</a></p>');
  });

  it.each([
    ["http", "http://example.com"],
    ["javascript", "javascript:alert(1)"],
    ["JAVASCRIPT mixed case", "JaVaScRiPt:alert(1)"],
    ["data", "data:text/html,<script>alert(1)</script>"],
    ["file", "file:///etc/passwd"],
    ["ftp", "ftp://example.com"],
    ["sms", "sms:+15551234567"],
    ["relative", "/admin"],
    ["protocol-relative", "//example.com"],
    ["bare domain", "example.com"],
    ["credentials", "https://user:pw@example.com"],
    ["look-alike host via @", "https://example.com@evil.com"],
    ["IP address", "https://192.168.0.1"],
    ["localhost", "https://localhost"],
    ["custom port", "https://example.com:8443"],
    ["whitespace", "https://example.com/a b"],
    ["empty", ""],
  ])("rejects a %s link", (_name, href) => {
    expect(errors(link(href)).length).toBeGreaterThan(0);
  });

  it("rejects an email link that carries anything but one address", () => {
    expect(errors(link("mailto:a@example.com?subject=hi")).join(" ")).toContain("subject is filled in automatically");
    for (const href of [
      "mailto:a@example.com?cc=b@example.com",
      "mailto:a@example.com?body=text",
      "mailto:a@example.com,b@example.com",
      "mailto:a@example.com;b@example.com",
      "mailto:a@example.com%0Abcc:c@example.com",
      "mailto:not an email",
      "mailto:a@example",
      "mailto:@example.com",
      "mailto:a@@example.com",
      "mailto:",
    ]) {
      expect(errors(link(href)).length, href).toBeGreaterThan(0);
    }
  });

  it("rejects a phone link that carries anything but a number", () => {
    for (const href of ["tel:+1555;ext=1", "tel:555,1234", "tel:*67", "tel:#31#5551234567", "tel:12", "tel:+1234567890123456", "tel:abc", "tel:"]) {
      expect(errors(link(href)).length, href).toBeGreaterThan(0);
    }
  });

  it("rejects a link with no address or no text, or nested in another link", () => {
    expect(errors("<a>text</a>").join(" ")).toContain("address");
    expect(errors('<a href="https://example.com"></a>').join(" ")).toContain("some text");
    expect(errors('<a href="https://example.com">x <strong><a href="https://example.org">y</a></strong></a>').join(" ")).toContain(
      "inside another link",
    );
  });

  it("repairs a link written directly inside another link into two separate links, as a browser would", () => {
    expect(ok('<a href="https://example.com">x <a href="https://example.org">y</a></a>')).toBe(
      '<p><a href="https://example.com/">x </a><a href="https://example.org/">y</a></p>',
    );
  });

  describe("link text can't pretend to be a different address", () => {
    it.each([
      ["a web address for another site", link("https://evil.example.com/login", "paypal.com")],
      ["a full URL for another site", link("https://evil.example.com", "https://mybank.com")],
      ["an email for another address", link("mailto:evil@example.com", "boss@company.com")],
      ["an email that goes to the web", link("https://evil.example.com", "boss@company.com")],
      ["a phone number for another number", link("tel:+15559999999", "+1 555 123 4567")],
      ["a phone number that goes to the web", link("https://evil.example.com", "555-123-4567")],
      ["a web address that goes to an email", link("mailto:evil@example.com", "example.com")],
    ])("rejects link text that is %s", (_name, html) => {
      expect(errors(html).join(" ")).toContain("looks like a different address");
    });

    it("accepts link text that matches where it goes", () => {
      ok(link("https://www.example.com/a", "example.com"));
      ok(link("https://example.com", "https://example.com"));
      ok(link("mailto:opticon@kcimanagement.com", "opticon@kcimanagement.com"));
      ok(link("mailto:Opticon@KCIManagement.com", "opticon@kcimanagement.com"));
      ok(link("tel:+15551234567", "+1 (555) 123-4567"));
      ok(link("tel:+15551234567", "555-123-4567"));
    });

    it("accepts ordinary words as link text", () => {
      ok(link("https://play.google.com/store/x", "Android"));
      ok(link("https://apps.apple.com/x", "iOS"));
      ok(link("https://www.g2.com/products/x", "Leave a review on G2"));
    });
  });
});

describe("structure", () => {
  it("rejects a list item outside a list, and a list with anything but items", () => {
    expect(errors("<li>x</li>").join(" ")).toContain("<li> must be inside an <ol>");
    expect(errors("<ol><p>x</p></ol>").join(" ")).toContain("can only contain <li>");
    expect(errors("<ol>loose text<li>x</li></ol>").join(" ")).toContain("can only contain <li>");
  });

  it("rejects blocks inside inline formatting or list items", () => {
    expect(errors("<strong><h2>x</h2></strong>").join(" ")).toContain("<h2> isn't allowed here");
    expect(errors("<ol><li><p>x</p></li></ol>").join(" ")).toContain("<p> isn't allowed here");
    expect(errors("<ol><li><ol><li>x</li></ol></li></ol>").join(" ")).toContain("<ol> isn't allowed here");
  });

  it("repairs unclosed and stray tags", () => {
    expect(ok("<p>never closed")).toBe("<p>never closed</p>");
    expect(ok("<p>text</p></p></div>")).toBe("<p>text</p>");
    expect(ok("<strong>bold to the end")).toBe("<p><strong>bold to the end</strong></p>");
  });
});

describe("limits", () => {
  it("rejects text longer than the limit, and absurdly long input early", () => {
    expect(normalizeHtmlContent("a".repeat(101), { maxLength: 100 })).toEqual({
      ok: false,
      errors: ["Text is too long (100 characters max)."],
    });
    expect(normalizeHtmlContent("a".repeat(1000), { maxLength: 100 }).ok).toBe(false);
  });

  it("measures the stored form, so heavy markup counts", () => {
    expect(normalizeHtmlContent("<b>a</b>".repeat(10), { maxLength: 100 }).ok).toBe(false);
    expect(normalizeHtmlContent("<b>a</b>".repeat(10), { maxLength: 400 }).ok).toBe(true);
  });
});

describe("what gets stored", () => {
  const corpus = [
    "",
    "plain",
    "a\n\nb\nc",
    "Tom & Jerry",
    "<p>x</p>",
    "<P>Mixed <B>Case</B> <I>Tags</I></P>",
    "<h1>One</h1><h6>Six</h6>",
    "<ol><li>a</li>\n<li>b <a href='https://example.com'>c</a></li></ol>",
    "Loose <b>text</b> then <h2>a heading</h2> then more",
    '<p>a<br>b<br/>c</p>',
    "<p>unclosed <strong>bold",
    '<a href="mailto:A@B.com">A@B.com</a> and <a href="tel:+1 555 123 4567">555 123 4567</a>',
    "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &copy; &nbsp; &#65;",
    "<p>emoji 😀 and unicode é</p>",
  ];

  it.each(corpus)("is unchanged when run a second time: %j", (input) => {
    const once = normalizeHtmlContent(input);
    if (!once.ok) throw new Error(once.errors.join(" | "));
    expect(ok(once.html)).toBe(once.html);
  });

  // Whatever is accepted, the stored text may contain only these tags and, on a
  // link, only an href — for a battery of hostile inputs as well.
  const hostile = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    '<a href="javascript:alert(1)">x</a>',
    '<p onclick="alert(1)">x</p>',
    "<iframe src=//evil.example></iframe>",
    "<style>body{display:none}</style>",
    "<<script>alert(1)//<</script>",
    "<scr<script>ipt>alert(1)</scr</script>ipt>",
    '<p title="><script>alert(1)</script>">x</p>',
    "<p>&lt;img src=x onerror=alert(1)&gt;</p>",
    "<b><script>alert(1)</script></b>",
    "<a href=\"https://example.com\" onfocus=\"alert(1)\">x</a>",
    "<!--<script>alert(1)</script>-->text",
    "<p>ok</p><object data=x></object>",
    "<form action=https://evil.example><input name=pw></form>",
    "`;alert(1);//",
    "<p>\u0000<b>null bytes</b>\u0000</p>",
  ];

  it.each([...corpus, ...hostile])("only ever stores allowed tags and attributes: %j", (input) => {
    const result = normalizeHtmlContent(input);
    if (!result.ok) return;
    const tags = [...result.html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)];
    for (const [, name, rest] of tags) {
      expect(["a", "h1", "h2", "h3", "h4", "h5", "h6", "p", "ol", "li", "strong", "em", "br"]).toContain(name);
      const attrs = rest.trim();
      if (attrs !== "") expect(name === "a" && /^href="[^"]*"$/.test(attrs)).toBe(true);
    }
    expect(result.html).not.toMatch(/<script/i);
  });

  it("never throws on random junk and always gives a consistent result", () => {
    let seed = 1234567;
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pieces = ["<", ">", "/", "p", "b", "a", "href", "=", '"', "'", " ", "\n", "&", "&amp;", "<p>", "</p>", "<b>", "<a href=\"https://example.com\">", "</a>", "<ol>", "<li>", "javascript:", "x", "<br>", "\u0000", "😀"];
    for (let i = 0; i < 400; i++) {
      let input = "";
      for (let n = next() * 30; n > 0; n--) input += pieces[Math.floor(next() * pieces.length)];
      const result = normalizeHtmlContent(input);
      if (result.ok) {
        const again = normalizeHtmlContent(result.html);
        expect(again.ok && again.html, JSON.stringify(input)).toBe(result.html);
      }
    }
  });
});
