import { isComment, isTag, isText, type ChildNode, type Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import { checkMailto, checkTel, looksLikeEmail, looksLikePhone } from "@/lib/contact-links";
import { checkHttpsUrl, checkWebsite } from "@/lib/safe-url";

// Text on More Info pages and Q&A answers is written as a small, fixed subset
// of HTML in an ordinary text box. This module is the filter that runs when it
// is submitted: it parses what was typed and either
//   * rejects it with a plain-English error (a tag, attribute or link that
//     isn't allowed), or
//   * returns it rewritten into one canonical form — lower-case tags, <b> as
//     <strong>, <i> as <em>, text escaped, structure repaired — which the mobile
//     app can display exactly as written.
// Nothing outside the allowed list can ever be stored: no scripts, styles,
// images, embedded pages, forms, divs, or attributes (the one exception is
// `href` on a link). The mobile app applies the same limits again when it
// displays the text.
//
// Plain text also works: a blank line starts a new paragraph and a single line
// break becomes <br>.

/** Every tag that is allowed. Lists are numbered only: <ol> with <li>. */
export const ALLOWED_TAGS = ["a", "h1", "h2", "h3", "h4", "h5", "h6", "p", "ol", "li", "strong", "b", "em", "i", "br"] as const;

export const MAX_SECTION_BODY_LENGTH = 10_000;

const ALLOWED_LIST = "<a>, <h1>–<h6>, <p>, <ol>, <li>, <strong>, <b>, <em>, <i>, <br>";
const MAX_ERRORS = 5;

export type HtmlContentResult = { ok: true; html: string } | { ok: false; errors: string[] };

type Inline =
  | { type: "text"; text: string }
  | { type: "br" }
  | { type: "break" } // a paragraph break inside loose top-level text; never stored
  | { type: "strong" | "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

type Block =
  | { type: "heading"; level: number; inlines: Inline[] }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "list"; items: Inline[][] };

const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ol", "li"]);
const collapse = (s: string) => s.replace(/\s+/g, " ");

class Problems {
  private readonly seen = new Set<string>();
  add(message: string) {
    this.seen.add(message);
  }
  get list(): string[] {
    return [...this.seen].slice(0, MAX_ERRORS);
  }
  get any(): boolean {
    return this.seen.size > 0;
  }
}

// ---- reading ---------------------------------------------------------------

function checkAttributes(el: Element, problems: Problems) {
  for (const name of Object.keys(el.attribs)) {
    if (el.name === "a" && name === "href") continue;
    problems.add(`The "${name}" attribute isn't allowed (on <${el.name}>). Only links may have an attribute, and only href.`);
  }
}

function plainText(inlines: Inline[]): string {
  return inlines
    .map((i) => (i.type === "text" ? i.text : i.type === "strong" || i.type === "em" || i.type === "link" ? plainText(i.children) : ""))
    .join("");
}

const hostOf = (url: string) => new URL(url).hostname.toLowerCase().replace(/^www\./, "");

/** The validated, canonical href for a link, or null (with the reason recorded). */
function checkHref(rawHref: string, label: string, problems: Problems): string | null {
  const href = rawHref.trim();
  if (!href) {
    problems.add("A link needs an address (href).");
    return null;
  }

  let url: string;
  let target: { kind: "web"; host: string } | { kind: "mail"; value: string } | { kind: "tel"; value: string };
  if (/^mailto:/i.test(href)) {
    const r = checkMailto(href);
    if (!r.ok) return problems.add(r.error), null;
    url = r.url;
    target = { kind: "mail", value: r.canonical.toLowerCase() };
  } else if (/^tel:/i.test(href)) {
    const r = checkTel(href);
    if (!r.ok) return problems.add(r.error), null;
    url = r.url;
    target = { kind: "tel", value: r.canonical.replace(/\D/g, "") };
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https:/i.test(href)) {
    problems.add(`Links must start with https://, mailto: or tel: — not "${href.split(":")[0]}:".`);
    return null;
  } else {
    const r = checkHttpsUrl(href);
    if (!r.ok) return problems.add(`Link "${href.slice(0, 60)}": ${r.error}`), null;
    url = r.url.href;
    target = { kind: "web", host: hostOf(url) };
  }

  // Link text that looks like an address must be the address it goes to, so
  // "paypal.com" can't point somewhere else.
  const text = label.trim();
  const mismatch = () =>
    problems.add(`The link text "${text.slice(0, 60)}" looks like a different address than where the link goes.`);
  if (looksLikeEmail(text)) {
    if (target.kind !== "mail" || text.toLowerCase() !== target.value) return mismatch(), null;
  } else if (looksLikePhone(text)) {
    const digits = text.replace(/\D/g, "");
    if (target.kind !== "tel" || !(target.value === digits || target.value.endsWith(digits))) return mismatch(), null;
  } else {
    const shown = checkWebsite(text);
    if (shown.ok && (target.kind !== "web" || hostOf(shown.url.href) !== target.host)) return mismatch(), null;
  }
  return url;
}

function readLink(el: Element, problems: Problems): Inline | null {
  checkAttributes(el, problems);
  const children = readInlines(el.children, problems, { inLink: true, loose: false });
  const label = plainText(children).trim();
  if (label === "") {
    problems.add("A link needs some text between <a> and </a>.");
    return null;
  }
  const href = checkHref(el.attribs.href ?? "", label, problems);
  return href ? { type: "link", href, children } : null;
}

/** Text at the top level, outside any tag: blank line = new paragraph, single newline = <br>. */
function looseText(data: string): Inline[] {
  const out: Inline[] = [];
  data
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n\s*/)
    .forEach((part, i) => {
      if (i > 0) out.push({ type: "break" });
      part.split("\n").forEach((line, j) => {
        if (j > 0) out.push({ type: "br" });
        out.push({ type: "text", text: collapse(line) });
      });
    });
  return out;
}

function readInlines(nodes: ChildNode[], problems: Problems, state: { inLink: boolean; loose: boolean }): Inline[] {
  const out: Inline[] = [];
  for (const node of nodes) {
    if (isText(node)) {
      out.push(...(state.loose ? looseText(node.data) : [{ type: "text", text: collapse(node.data) } as Inline]));
      continue;
    }
    if (isComment(node)) continue;
    if (!isTag(node)) {
      problems.add("That kind of markup isn't allowed.");
      continue;
    }

    switch (node.name) {
      case "br":
        checkAttributes(node, problems);
        out.push({ type: "br" });
        break;
      case "strong":
      case "b":
      case "em":
      case "i": {
        checkAttributes(node, problems);
        const children = readInlines(node.children, problems, { ...state, loose: false });
        out.push({ type: node.name === "strong" || node.name === "b" ? "strong" : "em", children });
        break;
      }
      case "a":
        if (state.inLink) {
          problems.add("A link can't be inside another link.");
        } else {
          const link = readLink(node, problems);
          if (link) out.push(link);
        }
        break;
      default:
        problems.add(
          BLOCK_TAGS.has(node.name)
            ? `<${node.name}> isn't allowed here. (Paragraphs, headings and lists go on their own, not inside other tags.)`
            : `<${node.name}> isn't allowed. You can use: ${ALLOWED_LIST}.`,
        );
    }
  }
  return out;
}

/** Trims outer whitespace and stray breaks, and drops empty pieces. */
function tidy(inlines: Inline[]): Inline[] {
  const items = inlines
    .map((i): Inline | null => {
      if (i.type === "strong" || i.type === "em" || i.type === "link") {
        const children = tidyInner(i.children);
        return children.length ? { ...i, children } : null;
      }
      return i.type === "text" && i.text === "" ? null : i;
    })
    .filter((i): i is Inline => i !== null);
  while (items.length && (items[0].type === "br" || (items[0].type === "text" && items[0].text.trim() === ""))) items.shift();
  while (items.length) {
    const last = items[items.length - 1];
    if (last.type === "br" || (last.type === "text" && last.text.trim() === "")) items.pop();
    else break;
  }
  const first = items[0];
  if (first?.type === "text") items[0] = { type: "text", text: first.text.trimStart() };
  const end = items[items.length - 1];
  if (end?.type === "text") items[items.length - 1] = { type: "text", text: end.text.trimEnd() };
  return items;
}

const tidyInner = (inlines: Inline[]): Inline[] => inlines.filter((i) => !(i.type === "text" && i.text === ""));

function paragraphsFrom(inlines: Inline[]): Block[] {
  const blocks: Block[] = [];
  let part: Inline[] = [];
  const flush = () => {
    const t = tidy(part);
    if (t.length) blocks.push({ type: "paragraph", inlines: t });
    part = [];
  };
  for (const i of inlines) {
    if (i.type === "break") flush();
    else part.push(i);
  }
  flush();
  return blocks;
}

function readList(el: Element, problems: Problems): Block | null {
  checkAttributes(el, problems);
  const items: Inline[][] = [];
  for (const child of el.children) {
    if (isComment(child) || (isText(child) && child.data.trim() === "")) continue;
    if (isTag(child) && child.name === "li") {
      checkAttributes(child, problems);
      const inlines = tidy(readInlines(child.children, problems, { inLink: false, loose: false }));
      if (inlines.length) items.push(inlines);
    } else {
      problems.add("A list (<ol>) can only contain <li> items.");
    }
  }
  return items.length ? { type: "list", items } : null;
}

function readBlocks(nodes: ChildNode[], problems: Problems): Block[] {
  const blocks: Block[] = [];
  let run: ChildNode[] = [];
  const flush = () => {
    if (run.length) blocks.push(...paragraphsFrom(readInlines(run, problems, { inLink: false, loose: true })));
    run = [];
  };

  for (const node of nodes) {
    if (!isTag(node) || !BLOCK_TAGS.has(node.name)) {
      run.push(node);
      continue;
    }
    flush();
    if (node.name === "li") {
      problems.add("<li> must be inside an <ol> list.");
    } else if (node.name === "ol") {
      const list = readList(node, problems);
      if (list) blocks.push(list);
    } else {
      checkAttributes(node, problems);
      const inlines = tidy(readInlines(node.children, problems, { inLink: false, loose: false }));
      if (inlines.length) {
        blocks.push(
          node.name === "p"
            ? { type: "paragraph", inlines }
            : { type: "heading", level: Number(node.name.slice(1)), inlines },
        );
      }
    }
  }
  flush();
  return blocks;
}

// ---- writing ---------------------------------------------------------------

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function writeInlines(inlines: Inline[]): string {
  return inlines
    .map((i) => {
      switch (i.type) {
        case "text":
          return escapeText(i.text);
        case "br":
          return "<br>";
        case "break":
          return "";
        case "strong":
          return `<strong>${writeInlines(i.children)}</strong>`;
        case "em":
          return `<em>${writeInlines(i.children)}</em>`;
        case "link":
          return `<a href="${escapeAttr(i.href)}">${writeInlines(i.children)}</a>`;
      }
    })
    .join("");
}

function writeBlock(block: Block): string {
  if (block.type === "heading") return `<h${block.level}>${writeInlines(block.inlines)}</h${block.level}>`;
  if (block.type === "paragraph") return `<p>${writeInlines(block.inlines)}</p>`;
  return `<ol>\n${block.items.map((item) => `<li>${writeInlines(item)}</li>`).join("\n")}\n</ol>`;
}

// ---- public ----------------------------------------------------------------

/**
 * Validates and canonicalises submitted text (see the top of this file). An
 * empty or blank input is fine and gives an empty string.
 */
export function normalizeHtmlContent(input: string, options: { maxLength?: number } = {}): HtmlContentResult {
  const maxLength = options.maxLength ?? MAX_SECTION_BODY_LENGTH;
  const tooLong: HtmlContentResult = { ok: false, errors: [`Text is too long (${maxLength} characters max).`] };
  if (input.length > maxLength * 3) return tooLong;

  const source = input.trim();
  if (source === "") return { ok: true, html: "" };

  const problems = new Problems();
  const blocks = readBlocks(parseDocument(source).children, problems);
  if (problems.any) return { ok: false, errors: problems.list };

  const html = blocks.map(writeBlock).join("\n\n");
  return html.length > maxLength ? tooLong : { ok: true, html };
}
