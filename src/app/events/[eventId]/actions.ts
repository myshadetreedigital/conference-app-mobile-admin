"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseEventRepository } from "@/repositories/supabase-event-repository";
import { SupabaseSpeakerRepository } from "@/repositories/supabase-speaker-repository";
import { SupabaseSponsorRepository } from "@/repositories/supabase-sponsor-repository";
import { SupabaseSessionRepository } from "@/repositories/supabase-session-repository";
import { renameEvent } from "@/services/event-service";
import { createSpeaker, updateSpeaker, deleteSpeaker } from "@/services/speaker-service";
import { createSponsor, updateSponsor, deleteSponsor } from "@/services/sponsor-service";
import { createSession, deleteSession } from "@/services/session-service";
import type { SponsorTier } from "@/repositories/sponsor-repository";
import { uploadEventMedia } from "@/lib/upload-event-media";

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

export async function createSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  const photoUrl = await uploadEventMedia(
    supabase,
    eventId,
    formData.get("photo") as File | null,
    "speakers",
  );
  await createSpeaker(repo, eventId, {
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    featured: formData.get("featured") === "on",
    photoUrl,
  });
  redirect(`/events/${eventId}`);
}

export async function updateSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  const speakerId = String(formData.get("speakerId") ?? "");
  const newPhoto = formData.get("photo") as File | null;
  const newPhotoUrl = newPhoto && newPhoto.size > 0
    ? await uploadEventMedia(supabase, eventId, newPhoto, "speakers")
    : undefined;
  await updateSpeaker(
    repo,
    speakerId,
    {
      name: String(formData.get("name") ?? ""),
      title: String(formData.get("title") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      featured: formData.get("featured") === "on",
    },
    newPhotoUrl,
  );
  redirect(`/events/${eventId}`);
}

export async function deleteSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  await deleteSpeaker(repo, String(formData.get("speakerId") ?? ""));
  redirect(`/events/${eventId}`);
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
  redirect(`/events/${eventId}`);
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
  redirect(`/events/${eventId}`);
}

export async function deleteSponsorAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSponsorRepository(supabase);
  await deleteSponsor(repo, String(formData.get("sponsorId") ?? ""));
  redirect(`/events/${eventId}`);
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
    redirect(`/events/${eventId}?error=${encodeURIComponent(firstError ?? "Please check your input.")}`);
  }
  redirect(`/events/${eventId}`);
}

export async function deleteSessionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSessionRepository(supabase);
  await deleteSession(repo, String(formData.get("sessionId") ?? ""));
  redirect(`/events/${eventId}`);
}
