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
  websiteUrl: string | null;
}

export interface UpdateSponsorData {
  name: string;
  tier: SponsorTier;
  websiteUrl: string | null;
  /** Omit to leave the existing logo unchanged — only set this when
   *  a new file was actually uploaded (or explicitly to null to clear it). */
  logoUrl?: string | null;
}

export interface SponsorRepository {
  listByEvent(eventId: string): Promise<Sponsor[]>;
  create(data: NewSponsor): Promise<Sponsor>;
  update(sponsorId: string, data: UpdateSponsorData): Promise<void>;
  delete(sponsorId: string): Promise<void>;
}
