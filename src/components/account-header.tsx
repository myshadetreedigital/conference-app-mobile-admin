import { createClient } from "@/lib/supabase/server";
import { SupabaseProfileRepository } from "@/repositories/supabase-profile-repository";
import { signOut } from "@/app/actions";

/**
 * Renders nothing when there's no session — this sits in the root
 * layout, so it's evaluated on every page including /login and
 * /register, which have no user yet.
 */
export async function AccountHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profileRepo = new SupabaseProfileRepository(supabase);
  const profile = await profileRepo.findById(user.id);
  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";

  return (
    <div className="flex items-center justify-end gap-3 border-b px-4 py-2 text-sm">
      <span className="text-zinc-600">{displayName || user.email}</span>
      <form action={signOut}>
        <button type="submit" className="text-zinc-600 underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
