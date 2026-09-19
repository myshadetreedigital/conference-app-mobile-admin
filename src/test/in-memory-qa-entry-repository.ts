import { randomUUID } from "node:crypto";
import type {
  NewQaEntry,
  QaEntry,
  QaEntryRepository,
  UpdateQaEntryData,
} from "@/repositories/qa-entry-repository";

export class InMemoryQaEntryRepository implements QaEntryRepository {
  private readonly byId = new Map<string, QaEntry>();

  private inSection(sectionId: string): QaEntry[] {
    return [...this.byId.values()]
      .filter((e) => e.sectionId === sectionId)
      .sort((a, b) => a.position - b.position);
  }

  async listByEvent(eventId: string): Promise<QaEntry[]> {
    return [...this.byId.values()]
      .filter((e) => e.eventId === eventId)
      .sort((a, b) => a.sectionId.localeCompare(b.sectionId) || a.position - b.position);
  }

  async create(input: NewQaEntry): Promise<QaEntry> {
    const existing = this.inSection(input.sectionId);
    const position = existing.length === 0 ? 0 : existing[existing.length - 1].position + 1;
    const entry: QaEntry = { id: randomUUID(), position, ...input };
    this.byId.set(entry.id, entry);
    return entry;
  }

  async update(entryId: string, data: UpdateQaEntryData): Promise<void> {
    const entry = this.byId.get(entryId);
    if (!entry) throw new Error("Q&A entry not found");
    entry.question = data.question;
    entry.answer = data.answer;
  }

  async delete(entryId: string): Promise<void> {
    this.byId.delete(entryId);
  }

  async reorder(sectionId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, position) => {
      const entry = this.byId.get(id);
      if (entry && entry.sectionId === sectionId) entry.position = position;
    });
  }
}
