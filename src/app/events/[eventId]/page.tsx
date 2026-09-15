import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { SupabaseEventRepository } from "@/repositories/supabase-event-repository";
import { SupabaseSpeakerRepository } from "@/repositories/supabase-speaker-repository";
import { SupabaseSponsorRepository } from "@/repositories/supabase-sponsor-repository";
import { SupabaseSessionRepository } from "@/repositories/supabase-session-repository";
import {
  renameEventAction,
  createSpeakerAction,
  deleteSpeakerAction,
  createSponsorAction,
  deleteSponsorAction,
  createSessionAction,
  deleteSessionAction,
} from "./actions";

const TIERS = ["diamond", "platinum", "gold", "silver", "bronze", "a_la_carte"] as const;

function formatSessionTime(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  const startText = start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!endsAt) return startText;
  const end = new Date(endsAt);
  const endText = end.toLocaleString(undefined, { timeStyle: "short" });
  return `${startText} – ${endText}`;
}

export default async function EventContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const { error } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const orgRepo = new SupabaseOrganizationRepository(supabase);
  const organization = await orgRepo.findByAdminUserId(user.id);
  if (!organization) redirect("/onboarding");

  const eventRepo = new SupabaseEventRepository(supabase);
  const event = await eventRepo.findById(eventId);
  if (!event) notFound();
  if (event.organizationId !== organization.id) notFound();

  const speakerRepo = new SupabaseSpeakerRepository(supabase);
  const sponsorRepo = new SupabaseSponsorRepository(supabase);
  const sessionRepo = new SupabaseSessionRepository(supabase);

  const [speakers, sponsors, sessions] = await Promise.all([
    speakerRepo.listByEvent(eventId),
    sponsorRepo.listByEvent(eventId),
    sessionRepo.listByEvent(eventId),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-10 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-zinc-500 underline">
          ← Back to events
        </Link>
        <p className="text-sm text-zinc-500">/{event.slug}</p>
        <form action={renameEventAction.bind(null, eventId)} className="mt-2 flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label htmlFor="event-name" className="text-xs font-medium text-zinc-500">
              Event name
            </label>
            <input
              id="event-name"
              name="name"
              defaultValue={event.name}
              required
              className="w-full rounded border px-3 py-2 text-2xl font-semibold"
            />
          </div>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
            Save
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sessions</h2>
        <ul className="space-y-2">
          {sessions.length === 0 && <li className="text-sm text-zinc-500">No sessions yet.</li>}
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between rounded border px-4 py-3">
              <div>
                <p className="font-medium">{session.title}</p>
                {formatSessionTime(session.startsAt, session.endsAt) && (
                  <p className="text-xs text-zinc-500">
                    {formatSessionTime(session.startsAt, session.endsAt)}
                  </p>
                )}
                {session.location && <p className="text-xs text-zinc-500">{session.location}</p>}
              </div>
              <form action={deleteSessionAction.bind(null, eventId)}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button type="submit" className="text-sm text-zinc-500 underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createSessionAction.bind(null, eventId)} className="space-y-2 border-t pt-4">
          <input name="title" placeholder="Title" required className="w-full rounded border px-3 py-2" />
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label htmlFor="startsAt" className="text-xs font-medium text-zinc-500">
                Starts
              </label>
              <input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="endsAt" className="text-xs font-medium text-zinc-500">
                Ends
              </label>
              <input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>
          <input name="location" placeholder="Location (optional)" className="w-full rounded border px-3 py-2" />
          <textarea
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded border px-3 py-2"
          />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
            Add session
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Speakers</h2>
        <ul className="space-y-2">
          {speakers.length === 0 && <li className="text-sm text-zinc-500">No speakers yet.</li>}
          {speakers.map((speaker) => (
            <li key={speaker.id} className="flex items-center justify-between rounded border px-4 py-3">
              <div className="flex items-center gap-3">
                {speaker.photoUrl && (
                  <Image
                    src={speaker.photoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{speaker.name}</p>
                  {speaker.title && <p className="text-xs text-zinc-500">{speaker.title}</p>}
                </div>
              </div>
              <form action={deleteSpeakerAction.bind(null, eventId)}>
                <input type="hidden" name="speakerId" value={speaker.id} />
                <button type="submit" className="text-sm text-zinc-500 underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createSpeakerAction.bind(null, eventId)} className="space-y-2 border-t pt-4">
          <input name="name" placeholder="Name" required className="w-full rounded border px-3 py-2" />
          <input name="title" placeholder="Title (optional)" className="w-full rounded border px-3 py-2" />
          <textarea name="bio" placeholder="Bio (optional)" className="w-full rounded border px-3 py-2" />
          <div className="space-y-1">
            <label htmlFor="speaker-photo" className="text-xs font-medium text-zinc-500">
              Photo (optional)
            </label>
            <input id="speaker-photo" name="photo" type="file" accept="image/*" className="block text-sm" />
          </div>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
            Add speaker
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sponsors</h2>
        <ul className="space-y-2">
          {sponsors.length === 0 && <li className="text-sm text-zinc-500">No sponsors yet.</li>}
          {sponsors.map((sponsor) => (
            <li key={sponsor.id} className="flex items-center justify-between rounded border px-4 py-3">
              <div className="flex items-center gap-3">
                {sponsor.logoUrl && (
                  <Image
                    src={sponsor.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded object-contain"
                  />
                )}
                <div>
                  <p className="font-medium">{sponsor.name}</p>
                  <p className="text-xs text-zinc-500">{sponsor.tier.replace("_", " ")}</p>
                </div>
              </div>
              <form action={deleteSponsorAction.bind(null, eventId)}>
                <input type="hidden" name="sponsorId" value={sponsor.id} />
                <button type="submit" className="text-sm text-zinc-500 underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createSponsorAction.bind(null, eventId)} className="space-y-2 border-t pt-4">
          <div className="flex items-end gap-2">
            <input name="name" placeholder="Name" required className="flex-1 rounded border px-3 py-2" />
            <select name="tier" className="rounded border px-3 py-2">
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="sponsor-logo" className="text-xs font-medium text-zinc-500">
              Logo (optional)
            </label>
            <input id="sponsor-logo" name="logo" type="file" accept="image/*" className="block text-sm" />
          </div>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
            Add sponsor
          </button>
        </form>
      </section>
    </div>
  );
}
