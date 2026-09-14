import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseOrganizationRepository(supabase);

  const existing = await repo.findByAdminUserId(user.id);
  if (existing) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <OnboardingForm defaultEmail={user.email ?? ""} />
    </div>
  );
}
