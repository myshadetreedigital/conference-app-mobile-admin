"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseSpeakerRepository } from "@/repositories/supabase-speaker-repository";
import { SupabaseSponsorRepository } from "@/repositories/supabase-sponsor-repository";
import { SupabaseSessionRepository } from "@/repositories/supabase-session-repository";
import { createSpeaker, deleteSpeaker } from "@/services/speaker-service";
import { createSponsor, deleteSponsor } from "@/services/sponsor-service";
import { createSession, deleteSession } from "@/services/session-service";
import type { SponsorTier } from "@/repositories/sponsor-repository";

export async function createSpeakerAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSpeakerRepository(supabase);
  await createSpeaker(repo, eventId, {
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
    bio: String(formData.get("bio") ?? ""),
  });
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
  await createSponsor(repo, eventId, {
    name: String(formData.get("name") ?? ""),
    tier: String(formData.get("tier") ?? "a_la_carte") as SponsorTier,
  });
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
  await createSession(repo, eventId, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    location: String(formData.get("location") ?? ""),
  });
  redirect(`/events/${eventId}`);
}

export async function deleteSessionAction(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseSessionRepository(supabase);
  await deleteSession(repo, String(formData.get("sessionId") ?? ""));
  redirect(`/events/${eventId}`);
}
