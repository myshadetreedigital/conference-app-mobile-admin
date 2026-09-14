"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { createOrganization } from "@/services/organization-service";

export type OnboardingState = {
  error?: string;
  duplicateOfId?: string;
};

/**
 * Bound to useActionState in onboarding-form.tsx. Only the success
 * path (and the "you already have one, go to the dashboard" path)
 * redirects — validation errors and the duplicate warning return
 * state instead, so the form stays mounted and updates in place
 * rather than round-tripping through a full page navigation.
 */
export async function createOrganizationAction(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
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

  if (result.status === "invalid") {
    const firstError = Object.values(result.errors)
      .flatMap((v) => (v && "_errors" in v ? v._errors : []))
      .find(Boolean);
    return { error: firstError ?? "Please check your input." };
  }

  if (result.status === "possible_duplicate") {
    return { duplicateOfId: result.duplicateOfId };
  }

  if (result.status === "already_has_organization") {
    redirect("/?message=You already have an organization set up.");
  }

  redirect("/");
}
