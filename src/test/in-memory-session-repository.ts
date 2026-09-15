import { randomUUID } from "node:crypto";
import type { NewSession, Session, SessionRepository } from "@/repositories/session-repository";

export class InMemorySessionRepository implements SessionRepository {
  private readonly byId = new Map<string, Session>();

  async listByEvent(eventId: string): Promise<Session[]> {
    return [...this.byId.values()].filter((s) => s.eventId === eventId);
  }

  async create(input: NewSession): Promise<Session> {
    const session: Session = { id: randomUUID(), startsAt: null, endsAt: null, ...input };
    this.byId.set(session.id, session);
    return session;
  }

  async delete(sessionId: string): Promise<void> {
    this.byId.delete(sessionId);
  }
}
