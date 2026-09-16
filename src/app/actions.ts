"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { SupabaseEventRepository } from "@/repositories/supabase-event-repository";
import { createEvent, publishEvent, archiveEvent } from "@/services/event-service";
import { updateOrganization } from "@/services/organization-service";

async function requireOrgId(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const orgRepo = new SupabaseOrganizationRepository(supabase);
  const org = await orgRepo.findByAdminUserId(userId);
  if (!org) redirect("/onboarding");
  return org.id;
}

export async function updateOrganizationAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const organizationId = await requireOrgId(user.id, supabase);
  const orgRepo = new SupabaseOrganizationRepository(supabase);

  const result = await updateOrganization(orgRepo, organizationId, {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
  });

  if (result.status === "invalid") {
    const firstError = Object.values(result.errors)
      .flatMap((v) => (v && "_errors" in v ? v._errors : []))
      .find(Boolean);
    redirect(`/?error=${encodeURIComponent(firstError ?? "Please check your input.")}`);
  }
  redirect("/?message=Organization updated.");
}

export async function createEventAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const organizationId = await requireOrgId(user.id, supabase);
  const eventRepo = new SupabaseEventRepository(supabase);

  const result = await createEvent(eventRepo, organizationId, {
    name: String(formData.get("name") ?? ""),
  });

  if (result.status === "invalid") {
    const message = result.errors.name?._errors[0] ?? "Please check your input.";
    redirect(`/?error=${encodeURIComponent(message)}`);
  }
  redirect("/");
}

export async function publishEventAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const eventRepo = new SupabaseEventRepository(supabase);
  const eventId = String(formData.get("eventId") ?? "");

  const result = await publishEvent(eventRepo, eventId);
  if (result.status === "already_live_elsewhere") {
    redirect(`/?error=${encodeURIComponent(result.message)}`);
  }
  redirect("/");
}

export async function archiveEventAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const eventRepo = new SupabaseEventRepository(supabase);
  const eventId = String(formData.get("eventId") ?? "");

  await archiveEvent(eventRepo, eventId);
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
