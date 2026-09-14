import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { SupabaseEventRepository } from "@/repositories/supabase-event-repository";
import {
  createEventAction,
  publishEventAction,
  archiveEventAction,
  signOut,
} from "./actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  live: "bg-green-100 text-green-800",
  archived: "bg-zinc-100 text-zinc-500",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireUser();
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const orgRepo = new SupabaseOrganizationRepository(supabase);
  const organization = await orgRepo.findByAdminUserId(user.id);
  if (!organization) {
    redirect("/onboarding");
  }

  const eventRepo = new SupabaseEventRepository(supabase);
  const events = await eventRepo.listByOrganization(organization.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{organization.name}</h1>
          <p className="text-sm text-zinc-600">Events</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-600 underline">
            Sign out
          </button>
        </form>
      </div>

      {message && <p className="text-sm text-zinc-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {events.length === 0 && (
          <li className="text-sm text-zinc-500">No events yet — create your first one below.</li>
        )}
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between rounded border px-4 py-3"
          >
            <div>
              <p className="font-medium">{event.name}</p>
              <p className="text-xs text-zinc-500">/{event.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[event.status]}`}
              >
                {event.status}
              </span>
              {event.status !== "live" && (
                <form action={publishEventAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button type="submit" className="text-sm underline">
                    Publish
                  </button>
                </form>
              )}
              {event.status !== "archived" && (
                <form action={archiveEventAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button type="submit" className="text-sm text-zinc-500 underline">
                    Archive
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form action={createEventAction} className="flex items-end gap-3 border-t pt-6">
        <div className="flex-1 space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            New event name
          </label>
          <input id="name" name="name" required className="w-full rounded border px-3 py-2" />
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
          Create
        </button>
      </form>
    </div>
  );
}
