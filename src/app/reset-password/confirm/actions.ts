"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function confirmResetCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  });
  if (verifyError) {
    redirect(
      `/reset-password/confirm?email=${encodeURIComponent(email)}&error=${encodeURIComponent(verifyError.message)}`,
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    redirect(
      `/reset-password/confirm?email=${encodeURIComponent(email)}&error=${encodeURIComponent(updateError.message)}`,
    );
  }

  redirect("/login?message=Password reset — log in with your new password.");
}
