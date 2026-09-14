"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const registerSchema = z.object({
  firstName: z.string().trim().default(""),
  lastName: z.string().trim().default(""),
  email: z.string().trim().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { first_name: parsed.data.firstName, last_name: parsed.data.lastName },
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is off, signUp returns a live session and
  // the user can go straight in — don't claim an email was sent when
  // one wasn't.
  if (data.session) {
    redirect("/onboarding");
  }
  redirect("/login?message=Check your email to confirm your account, then log in.");
}
