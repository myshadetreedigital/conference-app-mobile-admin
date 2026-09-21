import { randomUUID } from "node:crypto";
import type {
  NewSponsor,
  Sponsor,
  SponsorRepository,
  UpdateSponsorData,
} from "@/repositories/sponsor-repository";

export class InMemorySponsorRepository implements SponsorRepository {
  private readonly byId = new Map<string, Sponsor>();

  async listByEvent(eventId: string): Promise<Sponsor[]> {
    return [...this.byId.values()].filter((s) => s.eventId === eventId);
  }

  async create(input: NewSponsor): Promise<Sponsor> {
    const sponsor: Sponsor = { id: randomUUID(), ...input };
    this.byId.set(sponsor.id, sponsor);
    return sponsor;
  }

  async update(sponsorId: string, data: UpdateSponsorData): Promise<void> {
    const sponsor = this.byId.get(sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");
    sponsor.name = data.name;
    sponsor.tier = data.tier;
    sponsor.websiteUrl = data.websiteUrl;
    if (data.logoUrl !== undefined) sponsor.logoUrl = data.logoUrl;
  }

  async delete(sponsorId: string): Promise<void> {
    this.byId.delete(sponsorId);
  }
}
