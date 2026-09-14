"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { createOrganization } from "@/services/organization-service";

export async function createOrganizationAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseOrganizationRepository(supabase);

  const input = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
  };
  const confirmDespiteDuplicate = formData.get("confirmDespiteDuplicate") === "1";

  const result = await createOrganization(repo, user.id, input, { confirmDespiteDuplicate });

  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ ...input, ...extra }).toString();

  if (result.status === "invalid") {
    const firstError = Object.values(result.errors)
      .flatMap((v) => (v && "_errors" in v ? v._errors : []))
      .find(Boolean);
    redirect(`/onboarding?${qs({ error: firstError ?? "Please check your input." })}`);
  }

  if (result.status === "possible_duplicate") {
    redirect(`/onboarding?${qs({ duplicateOfId: result.duplicateOfId })}`);
  }

  redirect("/");
}
