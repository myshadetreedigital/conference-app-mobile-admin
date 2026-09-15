export interface Session {
  id: string;
  eventId: string;
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
}

export interface NewSession {
  eventId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface SessionRepository {
  listByEvent(eventId: string): Promise<Session[]>;
  create(data: NewSession): Promise<Session>;
  delete(sessionId: string): Promise<void>;
}
