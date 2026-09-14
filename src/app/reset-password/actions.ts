"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestResetCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  // resetPasswordForEmail sends an email containing both a link and a
  // token; the confirm page uses verifyOtp with that token — see
  // docs/backlog.md for why this is the code flow, not the link flow.
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/reset-password/confirm?email=${encodeURIComponent(email)}&sent=1`);
}
