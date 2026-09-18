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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
