import type { SpeakerLinks } from "@/lib/speaker-links";

export interface Speaker extends SpeakerLinks {
  id: string;
  eventId: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
  featured: boolean;
}

export interface NewSpeaker extends SpeakerLinks {
  eventId: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
  featured: boolean;
}

export interface UpdateSpeakerData extends SpeakerLinks {
  name: string;
  title: string;
  bio: string;
  featured: boolean;
  /** Omit to leave the existing photo unchanged — only set this when
   *  a new file was actually uploaded (or explicitly to null to clear it). */
  photoUrl?: string | null;
}

export interface SpeakerRepository {
  listByEvent(eventId: string): Promise<Speaker[]>;
  create(data: NewSpeaker): Promise<Speaker>;
  update(speakerId: string, data: UpdateSpeakerData): Promise<void>;
  delete(speakerId: string): Promise<void>;
}
