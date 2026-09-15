import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Event, EventRepository } from "@/repositories/event-repository";
import { toSlug } from "@/lib/slug";

export const createEventSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export type CreateEventInput = z.input<typeof createEventSchema>;

export type CreateEventResult =
  | { status: "created"; event: Event }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateEventInput> };

/**
 * Derives the slug from the name (never manually typed — see
 * docs/PRODUCT-DECISIONS.md's Slugs section), retrying with -2, -3,
 * ... on collision, same as WordPress resolves a duplicate post slug.
 * A name that slugifies to nothing falls back to a random suffix.
 */
export async function createEvent(
  repo: EventRepository,
  organizationId: string,
  rawInput: CreateEventInput,
): Promise<CreateEventResult> {
  const parsed = createEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }

  const base = toSlug(parsed.data.name) || randomUUID().slice(0, 8);
  let slug = base;
  let suffix = 2;
  while (await repo.findBySlug(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  const event = await repo.create({ organizationId, name: parsed.data.name, slug });
  return { status: "created", event };
}

export type PublishEventResult =
  | { status: "published" }
  | { status: "already_live_elsewhere"; message: string };

/** The events_one_live_per_org partial unique index is the real
 *  enforcement (see docs/ARCHITECTURE.md's "where business logic
 *  lives" section) — this just translates its rejection into a
 *  structured result instead of a raw thrown exception. */
export async function publishEvent(
  repo: EventRepository,
  eventId: string,
): Promise<PublishEventResult> {
  try {
    await repo.publish(eventId);
    return { status: "published" };
  } catch {
    return {
      status: "already_live_elsewhere",
      message:
        "Another event in this organization is already live — archive it first, or archive it after publishing this one.",
    };
  }
}

export async function archiveEvent(repo: EventRepository, eventId: string): Promise<void> {
  await repo.archive(eventId);
}

export const renameEventSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export type RenameEventInput = z.input<typeof renameEventSchema>;

export type RenameEventResult =
  | { status: "renamed" }
  | { status: "invalid"; errors: z.ZodFormattedError<RenameEventInput> };

// The slug deliberately does not change on rename — it's a stable
// identifier once created, not re-derived from the current name.
export async function renameEvent(
  repo: EventRepository,
  eventId: string,
  rawInput: RenameEventInput,
): Promise<RenameEventResult> {
  const parsed = renameEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.rename(eventId, parsed.data.name);
  return { status: "renamed" };
}
