export type SponsorTier = "diamond" | "platinum" | "gold" | "silver" | "bronze" | "a_la_carte";

export interface Sponsor {
  id: string;
  eventId: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string | null;
  websiteUrl: string | null;
}

export interface NewSponsor {
  eventId: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string | null;
}

export interface SponsorRepository {
  listByEvent(eventId: string): Promise<Sponsor[]>;
  create(data: NewSponsor): Promise<Sponsor>;
  delete(sponsorId: string): Promise<void>;
}
