import { randomUUID } from "node:crypto";
import type { NewSponsor, Sponsor, SponsorRepository } from "@/repositories/sponsor-repository";

export class InMemorySponsorRepository implements SponsorRepository {
  private readonly byId = new Map<string, Sponsor>();

  async listByEvent(eventId: string): Promise<Sponsor[]> {
    return [...this.byId.values()].filter((s) => s.eventId === eventId);
  }

  async create(input: NewSponsor): Promise<Sponsor> {
    const sponsor: Sponsor = { id: randomUUID(), websiteUrl: null, ...input };
    this.byId.set(sponsor.id, sponsor);
    return sponsor;
  }

  async delete(sponsorId: string): Promise<void> {
    this.byId.delete(sponsorId);
  }
}
