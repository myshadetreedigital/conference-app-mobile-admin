export interface Session {
  id: string;
  eventId: string;
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
  /** The speakers presenting this session (rows of session_speakers). */
  speakerIds: string[];
}

export interface SessionFields {
  title: string;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  speakerIds: string[];
}

export interface NewSession extends SessionFields {
  eventId: string;
}

export type UpdateSessionData = SessionFields;

export interface SessionRepository {
  listByEvent(eventId: string): Promise<Session[]>;
  create(data: NewSession): Promise<Session>;
  /** Changes the session's fields and makes its speaker links match `speakerIds` exactly. */
  update(sessionId: string, data: UpdateSessionData): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
