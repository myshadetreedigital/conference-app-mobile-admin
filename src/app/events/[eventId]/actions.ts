"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseEventRepository } from "@/repositories/supabase-event-repository";
import { SupabaseSpeakerRepository } from "@/repositories/supabase-speaker-repository";
import { SupabaseSponsorRepository } from "@/repositories/supabase-sponsor-repository";
import { SupabaseSessionRepository } from "@/repositories/supabase-session-repository";
import { SupabaseEventInfoSectionRepository } from "@/repositories/supabase-event-info-section-repository";
import { renameEvent, updateEventDetails, updateEventDetailsSchema } from "@/services/event-service";
import {
  createSpeaker,
  createSpeakerSchema,
  updateSpeaker,
  updateSpeakerSchema,
  deleteSpeaker,
} from "@/services/speaker-service";
import { createSponsor, updateSponsor, deleteSponsor } from "@/services/sponsor-service";
import { createSession, deleteSession } from "@/services/session-service";
import {
  createEventInfoSection,
  createEventInfoSectionSchema,
  updateEventInfoSection,
  updateEventInfoSectionSchema,
  deleteEventInfoSection,
} from "@/services/event-info-section-service";
import type { SponsorTier } from "@/repositories/sponsor-repository";
import type { EventInfoSectionIcon } from "@/repositories/event-info-section-repository";
import { SupabaseQaEntryRepository } from "@/repositories/supabase-qa-entry-repository";
import { saveQaPairs, validateQaPairs } from "@/services/qa-entry-service";
import { readQaPairs } from "@/lib/qa-pairs";
import { fieldsForRowType } from "@/lib/row-type";
import { describeSaveError } from "@/lib/save-error";
import { uploadEventMedia } from "@/lib/upload-event-media";
import { readSpeakerLinks } from "@/lib/speaker-links";

export async function renameEventAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseEventRepository(supabase);
  const result = await renameEvent(repo, eventId, { name: String(formData.get("name") ?? "") });

  if (result.status === "invalid") {
    const firstError = Object.values(result.errors)
      .flatMap((v) => (v && "_errors" in v ? v._errors : []))
      .find(Boolean);
    redirect(`/events/${eventId}?error=${encodeURIComponent(firstError ?? "Please check your input.")}`);
  }
  redirect(`/events/${eventId}`);
}

export async function updateEventDetailsAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseEventRepository(supabase);
  const fields = {
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    location: String(formData.get("location") ?? ""),
    startsAt: String(formData.get("startsAt") ?? "") || null,
    endsAt: String(formData.get("endsAt") ?? "") || null,
    banner1LinkUrl: String(formData.get("banner1Link") ?? "") || null,
    banner2LinkUrl: String(formData.get("banner2Link") ?? "") || null,
    primaryColor: String(formData.get("primaryColor") ?? "") || null,
  };
  // Validate before uploading, so a rejected link doesn't leave orphaned images in storage.
  const check = updateEventDetailsSchema.safeParse(fields);
  if (!check.success) redirectWithError(eventId, "details", firstErrorMessage(check.error.format()));

  const newLogo = formData.get("logo") as File | null;
  const newLogoUrl = newLogo && newLogo.size > 0
    ? await uploadEventMedia(supabase, eventId, newLogo, "events")
    : undefined;
  const newBanner1 = formData.get("banner1Image") as File | null;
  const newBanner1Url = newBanner1 && newBanner1.size > 0
    ? await uploadEventMedia(supabase, eventId, newBanner1, "events")
    : undefined;
  const newBanner2 = formData.get("banner2Image") as File | null;
  const newBanner2Url = newBanner2 && newBanner2.size > 0
    ? await uploadEventMedia(supabase, eventId, newBanner2, "events")
    : undefined;
  const newLocationImage = formData.get("locationImage") as File | null;
  const newLocationImageUrl = newLocationImage && newLocationImage.size > 0
    ? await uploadEventMedia(supabase, eventId, newLocationImage, "events")
    : undefined;
  const result = await updateEventDetails(
    repo,
    eventId,
    fields,
    newLogoUrl,
    newBanner1Url,
    newBanner2Url,
    newLocationImageUrl,
  );
  if (result.status === "invalid") redirectWithError(eventId, "details", firstErrorMessage(result.errors));
  redirect(`/events/${eventId}?tab=details`);
}

/** First human-readable message from a zod `.format()` error tree. */
function firstErrorMessage(errors: object): string {
  return (
    Object.values(errors)
      .flatMap((v) => (v && typeof v === "object" && "_errors" in v ? (v as { _errors: string[] })._errors : []))
      .find(Boolean) ?? "Please check your input."
  );
}

function redirectWithError(eventId: string, tab: string, message: string, openSectionId?: string): never {
  const open = openSectionId ? `&open=${encodeURIComponent(openSectionId)}` : "";
  redirect(`/events/${eventId}?tab=${tab}${open}&error=${encodeURIComponent(message)}`);
}

export async function createSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  const fields = {
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    featured: formData.get("featured") === "on",
    ...readSpeakerLinks(formData),
  };
  // Validate before uploading, so a rejected link doesn't leave an orphaned photo in storage.
  const check = createSpeakerSchema.safeParse(fields);
  if (!check.success) redirectWithError(eventId, "speakers", firstErrorMessage(check.error.format()));

  const photoUrl = await uploadEventMedia(
    supabase,
    eventId,
    formData.get("photo") as File | null,
    "speakers",
  );
  const result = await createSpeaker(repo, eventId, { ...fields, photoUrl });
  if (result.status === "invalid") redirectWithError(eventId, "speakers", firstErrorMessage(result.errors));
  redirect(`/events/${eventId}?tab=speakers`);
}

export async function updateSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  const speakerId = String(formData.get("speakerId") ?? "");
  const fields = {
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    featured: formData.get("featured") === "on",
    ...readSpeakerLinks(formData),
  };
  const check = updateSpeakerSchema.safeParse(fields);
  if (!check.success) redirectWithError(eventId, "speakers", firstErrorMessage(check.error.format()));

  const newPhoto = formData.get("photo") as File | null;
  const newPhotoUrl = newPhoto && newPhoto.size > 0
    ? await uploadEventMedia(supabase, eventId, newPhoto, "speakers")
    : undefined;
  const result = await updateSpeaker(repo, speakerId, fields, newPhotoUrl);
  if (result.status === "invalid") redirectWithError(eventId, "speakers", firstErrorMessage(result.errors));
  redirect(`/events/${eventId}?tab=speakers`);
}

export async function deleteSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  await deleteSpeaker(repo, String(formData.get("speakerId") ?? ""));
  redirect(`/events/${eventId}?tab=speakers`);
}

export async function createSponsorAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSponsorRepository(supabase);
  const logoUrl = await uploadEventMedia(
    supabase,
    eventId,
    formData.get("logo") as File | null,
    "sponsors",
  );
  await createSponsor(repo, eventId, {
    name: String(formData.get("name") ?? ""),
    tier: String(formData.get("tier") ?? "a_la_carte") as SponsorTier,
    logoUrl,
  });
  redirect(`/events/${eventId}?tab=sponsors`);
}

export async function updateSponsorAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSponsorRepository(supabase);
  const sponsorId = String(formData.get("sponsorId") ?? "");
  const newLogo = formData.get("logo") as File | null;
  const newLogoUrl = newLogo && newLogo.size > 0
    ? await uploadEventMedia(supabase, eventId, newLogo, "sponsors")
    : undefined;
  await updateSponsor(
    repo,
    sponsorId,
    {
      name: String(formData.get("name") ?? ""),
      tier: String(formData.get("tier") ?? "a_la_carte") as SponsorTier,
    },
    newLogoUrl,
  );
  redirect(`/events/${eventId}?tab=sponsors`);
}

export async function deleteSponsorAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSponsorRepository(supabase);
  await deleteSponsor(repo, String(formData.get("sponsorId") ?? ""));
  redirect(`/events/${eventId}?tab=sponsors`);
}

export async function createSessionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSessionRepository(supabase);
  const result = await createSession(repo, eventId, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    location: String(formData.get("location") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  });

  if (result.status === "invalid") {
    const firstError = Object.values(result.errors)
      .flatMap((v) => (v && "_errors" in v ? v._errors : []))
      .find(Boolean);
    redirect(
      `/events/${eventId}?tab=sessions&error=${encodeURIComponent(firstError ?? "Please check your input.")}`,
    );
  }
  redirect(`/events/${eventId}?tab=sessions`);
}

export async function deleteSessionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSessionRepository(supabase);
  await deleteSession(repo, String(formData.get("sessionId") ?? ""));
  redirect(`/events/${eventId}?tab=sessions`);
}

/** What a More Info form action reports back when it doesn't redirect: a message to show beside Save. */
export type SectionFormState = { error?: string };

/** The stored fields for a submitted More Info form, and its checked Q&A pairs when it is a Q&A page. */
function readSectionForm(formData: FormData) {
  const fields = {
    icon: String(formData.get("icon") ?? "info") as EventInfoSectionIcon,
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    ...fieldsForRowType(String(formData.get("rowType") ?? "")),
  };
  const qaPairs = fields.pageStyle === "qa" ? validateQaPairs(readQaPairs(formData)) : null;
  return { fields, qaPairs };
}

const qaProblems = (errors: string[]) => errors.slice(0, 3).join(" ");

// The two More Info actions check the row AND its questions before writing
// anything, so a problem never leaves a half-saved row. On a problem they return
// the message instead of redirecting, so the form (which keeps everything typed in
// browser state) stays exactly as it was and nothing has to be typed again.

export async function createEventInfoSectionAction(
  eventId: string,
  _previous: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireUser();
  const { fields, qaPairs } = readSectionForm(formData);

  const check = createEventInfoSectionSchema.safeParse(fields);
  if (!check.success) return { error: firstErrorMessage(check.error.format()) };
  if (qaPairs && !qaPairs.ok) return { error: qaProblems(qaPairs.errors) };

  const supabase = await createClient();
  let result;
  try {
    result = await createEventInfoSection(new SupabaseEventInfoSectionRepository(supabase), eventId, fields);
  } catch (error) {
    return { error: describeSaveError(error) };
  }
  if (result.status === "invalid") return { error: firstErrorMessage(result.errors) };

  const sectionId = result.section.id;
  if (qaPairs?.ok) {
    try {
      await saveQaPairs(new SupabaseQaEntryRepository(supabase), { eventId, sectionId }, qaPairs.pairs);
    } catch (error) {
      redirectWithError(eventId, "my-event", `The row was added, but its questions couldn't be saved (${(error as Error).message}). Open it and save again.`, sectionId);
    }
    redirect(`/events/${eventId}?tab=my-event&open=${encodeURIComponent(sectionId)}`);
  }
  redirect(`/events/${eventId}?tab=my-event`);
}

export async function updateEventInfoSectionAction(
  eventId: string,
  _previous: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireUser();
  const sectionId = String(formData.get("sectionId") ?? "");
  const { fields, qaPairs } = readSectionForm(formData);

  const check = updateEventInfoSectionSchema.safeParse(fields);
  if (!check.success) return { error: firstErrorMessage(check.error.format()) };
  if (qaPairs && !qaPairs.ok) return { error: qaProblems(qaPairs.errors) };

  const supabase = await createClient();
  let result;
  try {
    result = await updateEventInfoSection(new SupabaseEventInfoSectionRepository(supabase), sectionId, fields);
  } catch (error) {
    return { error: describeSaveError(error) };
  }
  if (result.status === "invalid") return { error: firstErrorMessage(result.errors) };

  if (qaPairs?.ok) {
    try {
      await saveQaPairs(new SupabaseQaEntryRepository(supabase), { eventId, sectionId }, qaPairs.pairs);
    } catch (error) {
      redirectWithError(eventId, "my-event", `The row was saved, but its questions couldn't be (${(error as Error).message}). Save again.`, sectionId);
    }
  }
  redirect(`/events/${eventId}?tab=my-event&open=${encodeURIComponent(sectionId)}`);
}

export async function deleteEventInfoSectionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseEventInfoSectionRepository(supabase);
  await deleteEventInfoSection(repo, String(formData.get("sectionId") ?? ""));
  redirect(`/events/${eventId}?tab=my-event`);
}
