import { randomUUID } from "node:crypto";
import type { NewSpeaker, Speaker, SpeakerRepository } from "@/repositories/speaker-repository";

export class InMemorySpeakerRepository implements SpeakerRepository {
  private readonly byId = new Map<string, Speaker>();

  async listByEvent(eventId: string): Promise<Speaker[]> {
    return [...this.byId.values()].filter((s) => s.eventId === eventId);
  }

  async create(input: NewSpeaker): Promise<Speaker> {
    const speaker: Speaker = { id: randomUUID(), photoUrl: null, ...input };
    this.byId.set(speaker.id, speaker);
    return speaker;
  }

  async delete(speakerId: string): Promise<void> {
    this.byId.delete(speakerId);
  }
}
