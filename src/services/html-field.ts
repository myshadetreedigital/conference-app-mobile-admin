import { z } from "zod";
import { normalizeHtmlContent } from "@/lib/html-content";

/**
 * A text field holding the allowed subset of HTML (see src/lib/html-content.ts).
 * A blank value is fine; otherwise the submitted text is either rejected with
 * an error for each problem found, or replaced by its canonical form, which is
 * what gets stored.
 */
export function htmlField(maxLength: number) {
  return z
    .string()
    .default("")
    .transform((value, ctx): string => {
      const result = normalizeHtmlContent(value, { maxLength });
      if (!result.ok) {
        for (const message of result.errors) ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return result.html;
    });
}
