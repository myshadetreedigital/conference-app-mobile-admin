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
  updateEventInfoSection,
  deleteEventInfoSection,
} from "@/services/event-info-section-service";
import type { SponsorTier } from "@/repositories/sponsor-repository";
import type {
  EventInfoSectionIcon,
  EventInfoSectionLinkTarget,
} from "@/repositories/event-info-section-repository";
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

function redirectWithError(eventId: string, tab: string, message: string): never {
  redirect(`/events/${eventId}?tab=${tab}&error=${encodeURIComponent(message)}`);
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

export async function createEventInfoSectionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseEventInfoSectionRepository(supabase);
  const result = await createEventInfoSection(repo, eventId, {
    icon: String(formData.get("icon") ?? "info") as EventInfoSectionIcon,
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    linkTarget: (String(formData.get("linkTarget") ?? "") || null) as EventInfoSectionLinkTarget | null,
  });
  if (result.status === "invalid") redirectWithError(eventId, "my-event", firstErrorMessage(result.errors));
  redirect(`/events/${eventId}?tab=my-event`);
}

export async function updateEventInfoSectionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseEventInfoSectionRepository(supabase);
  const sectionId = String(formData.get("sectionId") ?? "");
  const result = await updateEventInfoSection(repo, sectionId, {
    icon: String(formData.get("icon") ?? "info") as EventInfoSectionIcon,
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    linkTarget: (String(formData.get("linkTarget") ?? "") || null) as EventInfoSectionLinkTarget | null,
  });
  if (result.status === "invalid") redirectWithError(eventId, "my-event", firstErrorMessage(result.errors));
  redirect(`/events/${eventId}?tab=my-event`);
}

export async function deleteEventInfoSectionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseEventInfoSectionRepository(supabase);
  await deleteEventInfoSection(repo, String(formData.get("sectionId") ?? ""));
  redirect(`/events/${eventId}?tab=my-event`);
}
