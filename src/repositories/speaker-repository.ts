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

export interface SpeakerRepository {
  listByEvent(eventId: string): Promise<Speaker[]>;
  create(data: NewSpeaker): Promise<Speaker>;
  delete(speakerId: string): Promise<void>;
}
