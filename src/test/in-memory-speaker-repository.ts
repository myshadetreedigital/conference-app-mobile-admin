import { randomUUID } from "node:crypto";
import type {
  NewSpeaker,
  Speaker,
  SpeakerRepository,
  UpdateSpeakerData,
} from "@/repositories/speaker-repository";

export class InMemorySpeakerRepository implements SpeakerRepository {
  private readonly byId = new Map<string, Speaker>();

  async listByEvent(eventId: string): Promise<Speaker[]> {
    return [...this.byId.values()].filter((s) => s.eventId === eventId);
  }

  async create(input: NewSpeaker): Promise<Speaker> {
    const speaker: Speaker = { id: randomUUID(), ...input };
    this.byId.set(speaker.id, speaker);
    return speaker;
  }

  async update(speakerId: string, data: UpdateSpeakerData): Promise<void> {
    const speaker = this.byId.get(speakerId);
    if (!speaker) throw new Error("Speaker not found");
    speaker.name = data.name;
    speaker.title = data.title;
    speaker.bio = data.bio;
    speaker.featured = data.featured;
    if (data.photoUrl !== undefined) speaker.photoUrl = data.photoUrl;
  }

  async delete(speakerId: string): Promise<void> {
    this.byId.delete(speakerId);
  }
}
