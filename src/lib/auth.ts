import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Redirects to /login if there's no authenticated user; otherwise
 *  returns it. Use at the top of any Server Component or Server
 *  Action that requires auth. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}
