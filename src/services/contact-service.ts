import { z } from "zod";
import type { Contact, ContactRepository } from "@/repositories/contact-repository";

export const createContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export type CreateContactInput = z.input<typeof createContactSchema>;

export type CreateContactResult =
  | { status: "created"; contact: Contact }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateContactInput> };

export async function createContact(
  repo: ContactRepository,
  ownerId: string,
  eventId: string,
  rawInput: CreateContactInput,
): Promise<CreateContactResult> {
  const parsed = createContactSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const contact = await repo.create({ ownerId, eventId, ...parsed.data });
  return { status: "created", contact };
}

export const updateContactSchema = createContactSchema;

export type UpdateContactInput = z.input<typeof updateContactSchema>;

export type UpdateContactResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<UpdateContactInput> };

export async function updateContact(
  repo: ContactRepository,
  contactId: string,
  rawInput: UpdateContactInput,
): Promise<UpdateContactResult> {
  const parsed = updateContactSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(contactId, parsed.data);
  return { status: "updated" };
}

export async function deleteContact(repo: ContactRepository, contactId: string): Promise<void> {
  await repo.delete(contactId);
}
