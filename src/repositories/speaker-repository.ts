export interface Speaker {
  id: string;
  eventId: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
}

export interface NewSpeaker {
  eventId: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
}

export interface UpdateSpeakerData {
  name: string;
  title: string;
  bio: string;
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
