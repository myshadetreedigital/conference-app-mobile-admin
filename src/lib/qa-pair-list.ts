import { moveItem } from "@/lib/qa-pairs";

// The state behind the Q&A pair boxes in the More Info form. Pairs are added,
// removed, reordered and collapsed in the browser; nothing is saved until the
// form is submitted. Kept as small pure functions so the rules are testable.

export interface PairState {
  /** Stable React key: the stored entry's id, or a generated one for a new pair. */
  key: string;
  /** The stored entry's id, or "" for a pair that hasn't been saved yet. */
  id: string;
  question: string;
  answer: string;
  /** Whether the pair's boxes are showing (collapsed pairs still submit their values). */
  open: boolean;
}

export interface StoredPair {
  id: string;
  question: string;
  answer: string;
}

const blankPair = (key: string): PairState => ({ key, id: "", question: "", answer: "", open: true });

/** The next unused key for a new pair ("new-1", "new-2", …), worked out from the list itself. */
function freeKey(pairs: PairState[]): string {
  const used = new Set(pairs.map((p) => p.key));
  let n = 1;
  while (used.has(`new-${n}`)) n++;
  return `new-${n}`;
}

/**
 * The pairs to start with. Saved pairs start collapsed, so a long page opens as a
 * short list of questions; a page with none starts with one blank, open pair so
 * the boxes are there immediately.
 */
export function initialPairs(stored: StoredPair[]): PairState[] {
  if (stored.length === 0) return [blankPair("new-0")];
  return stored.map((p) => ({ key: p.id, id: p.id, question: p.question, answer: p.answer, open: false }));
}

export const addPair = (pairs: PairState[]): PairState[] => [...pairs, blankPair(freeKey(pairs))];

export const removePair = (pairs: PairState[], key: string): PairState[] => pairs.filter((p) => p.key !== key);

export const movePair = (pairs: PairState[], key: string, direction: "up" | "down"): PairState[] =>
  moveItem(pairs, pairs.findIndex((p) => p.key === key), direction);

export const togglePair = (pairs: PairState[], key: string): PairState[] =>
  pairs.map((p) => (p.key === key ? { ...p, open: !p.open } : p));

export const setAllOpen = (pairs: PairState[], open: boolean): PairState[] => pairs.map((p) => ({ ...p, open }));

export const editPair = (
  pairs: PairState[],
  key: string,
  patch: Partial<Pick<PairState, "question" | "answer">>,
): PairState[] => pairs.map((p) => (p.key === key ? { ...p, ...patch } : p));

/** The one-line title shown for a pair, so a collapsed pair is still recognisable. */
export function pairTitle(pair: Pick<PairState, "question">, maxLength = 80): string {
  const text = pair.question.replace(/\s+/g, " ").trim();
  if (!text) return "New question";
  const chars = Array.from(text);
  return chars.length > maxLength ? `${chars.slice(0, maxLength - 1).join("")}…` : text;
}
