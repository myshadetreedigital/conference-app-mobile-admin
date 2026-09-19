import type { QaPairInput } from "@/services/qa-entry-service";

/**
 * The Q&A pairs from a submitted More Info form, in the order they appear on
 * the page. Each pair is three inputs (a hidden id, the question, the answer)
 * named qaId / qaQuestion / qaAnswer, so the lists line up by position.
 */
export function readQaPairs(formData: FormData): QaPairInput[] {
  const ids = formData.getAll("qaId").map(String);
  const answers = formData.getAll("qaAnswer").map(String);
  return formData.getAll("qaQuestion").map((question, i) => ({
    id: ids[i] ?? "",
    question: String(question),
    answer: answers[i] ?? "",
  }));
}

/** A copy of `items` with the one at `index` swapped with its neighbour; unchanged at the ends. */
export function moveItem<T>(items: readonly T[], index: number, direction: "up" | "down"): T[] {
  const to = direction === "up" ? index - 1 : index + 1;
  const next = [...items];
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return next;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
