"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestResetCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  // Supabase's default "Reset Password" email template only embeds
  // {{ .ConfirmationURL }} (a link) — it does NOT include {{ .Token }}
  // (a visible code) unless the template is edited to add it. The
  // code flow this app uses (see docs/PRODUCT-DECISIONS.md) requires
  // that edit to actually exist in the Supabase dashboard
  // (Authentication -> Email Templates -> Reset Password) — this
  // function alone can't make that email contain a code.
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/reset-password/confirm?email=${encodeURIComponent(email)}&sent=1`);
}
