// One question-and-answer pair on a More Info row whose page style is "qa".
// The mobile app shows a row's entries in order, numbered, each on an
// alternating background band.

export interface QaEntry {
  id: string;
  eventId: string;
  sectionId: string;
  /** 0-based order within the section. */
  position: number;
  question: string;
  answer: string;
}

export interface NewQaEntry {
  eventId: string;
  sectionId: string;
  question: string;
  answer: string;
}

export interface UpdateQaEntryData {
  question: string;
  answer: string;
}

export interface QaEntryRepository {
  /** Every entry for an event, ordered by section then position — one query for the whole admin page. */
  listByEvent(eventId: string): Promise<QaEntry[]>;
  /** Appended after the section's last entry. */
  create(data: NewQaEntry): Promise<QaEntry>;
  update(entryId: string, data: UpdateQaEntryData): Promise<void>;
  delete(entryId: string): Promise<void>;
  /** Rewrites positions so `orderedIds` (all of the section's entry ids) become 0, 1, 2, … */
  reorder(sectionId: string, orderedIds: string[]): Promise<void>;
}
