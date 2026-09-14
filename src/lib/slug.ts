/**
 * WordPress `sanitize_title()`-style slug generation. See
 * docs/PRODUCT-DECISIONS.md's Slugs section for the exact rule this
 * follows, and slug.test.ts for the regression cases that shaped it.
 */
export function toSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
