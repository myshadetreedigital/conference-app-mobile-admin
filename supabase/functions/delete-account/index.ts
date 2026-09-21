// Deletes the calling user's own account — required by both Apple
// (Guideline 5.1.1v) and Google Play policy for any app with account
// creation. Must run server-side: actually removing an auth.users row
// requires the service-role key, which can never ship to the mobile
// client. profiles/bookmarks/personal_contacts all reference auth.users
// with `on delete cascade` (see migrations 0001/0003), so deleting the
// auth user is sufficient — no separate per-table cleanup needed.
//
// Intended for attendee (mobile app) accounts, which never hold
// admin_memberships. If this is ever invoked for an admin-web account,
// note that admin_memberships also cascades on user delete — deleting
// an org's only owner would orphan that organization.
// Pinned to an exact version: an unpinned "@2" would let whatever esm.sh serves next run here,
// next to the service-role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Scoped to the caller's own JWT — only used to verify who they are,
  // never to perform the deletion itself.
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  // Service-role client — only ever runs here, server-side.
  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Admin accounts and attendee accounts share one login system. Deleting an organizer's
  // account here would cascade away their membership and could orphan the organization,
  // so this endpoint refuses; an organizer's account is removed by the platform operator.
  const { data: memberships, error: membershipError } = await adminClient
    .from("admin_memberships")
    .select("id")
    .eq("user_id", userData.user.id)
    .limit(1);
  if (membershipError) {
    return new Response(JSON.stringify({ error: "Could not check account type" }), { status: 500 });
  }
  if (memberships && memberships.length > 0) {
    return new Response(
      JSON.stringify({ error: "Organizer accounts can't be deleted from the app. Contact the platform operator." }),
      { status: 403 },
    );
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
