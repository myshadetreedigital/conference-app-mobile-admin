import { z } from "zod";
import { EVENT_INFO_SECTION_ICONS } from "@/repositories/event-info-section-repository";
import type { EventInfoSection, EventInfoSectionRepository } from "@/repositories/event-info-section-repository";

const iconSchema = z.enum(EVENT_INFO_SECTION_ICONS);

export const createEventInfoSectionSchema = z.object({
  icon: iconSchema,
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().default(""),
});

export type CreateEventInfoSectionInput = z.input<typeof createEventInfoSectionSchema>;

export type CreateEventInfoSectionResult =
  | { status: "created"; section: EventInfoSection }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateEventInfoSectionInput> };

export async function createEventInfoSection(
  repo: EventInfoSectionRepository,
  eventId: string,
  rawInput: CreateEventInfoSectionInput,
): Promise<CreateEventInfoSectionResult> {
  const parsed = createEventInfoSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const section = await repo.create({ eventId, ...parsed.data });
  return { status: "created", section };
}

export const updateEventInfoSectionSchema = z.object({
  icon: iconSchema,
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().default(""),
});

export type UpdateEventInfoSectionInput = z.input<typeof updateEventInfoSectionSchema>;

export type UpdateEventInfoSectionResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<UpdateEventInfoSectionInput> };

export async function updateEventInfoSection(
  repo: EventInfoSectionRepository,
  sectionId: string,
  rawInput: UpdateEventInfoSectionInput,
): Promise<UpdateEventInfoSectionResult> {
  const parsed = updateEventInfoSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(sectionId, parsed.data);
  return { status: "updated" };
}

export async function deleteEventInfoSection(
  repo: EventInfoSectionRepository,
  sectionId: string,
): Promise<void> {
  await repo.delete(sectionId);
}
