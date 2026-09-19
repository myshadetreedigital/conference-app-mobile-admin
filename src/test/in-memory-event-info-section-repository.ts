import { randomUUID } from "node:crypto";
import type {
  EventInfoSection,
  EventInfoSectionRepository,
  NewEventInfoSection,
  UpdateEventInfoSectionData,
} from "@/repositories/event-info-section-repository";

export class InMemoryEventInfoSectionRepository implements EventInfoSectionRepository {
  private readonly byId = new Map<string, EventInfoSection>();

  async listByEvent(eventId: string): Promise<EventInfoSection[]> {
    return [...this.byId.values()].filter((s) => s.eventId === eventId);
  }

  async create(input: NewEventInfoSection): Promise<EventInfoSection> {
    const section: EventInfoSection = { id: randomUUID(), ...input };
    this.byId.set(section.id, section);
    return section;
  }

  async update(sectionId: string, data: UpdateEventInfoSectionData): Promise<void> {
    const section = this.byId.get(sectionId);
    if (!section) throw new Error("Event info section not found");
    section.icon = data.icon;
    section.title = data.title;
    section.body = data.body;
    section.linkTarget = data.linkTarget;
    section.pageStyle = data.pageStyle;
  }

  async delete(sectionId: string): Promise<void> {
    this.byId.delete(sectionId);
  }
}
