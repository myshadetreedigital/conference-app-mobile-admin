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
import { SupabaseEventInfoSectionRepository } from "@/repositories/supabase-event-info-section-repository";
import { EVENT_INFO_SECTION_ICONS } from "@/repositories/event-info-section-repository";
import { SupabaseQaEntryRepository } from "@/repositories/supabase-qa-entry-repository";
import { isScreenRowType, ROW_TYPE_GROUPS, rowTypeLabel, rowTypeOf, type RowType } from "@/lib/row-type";
import { QaEntriesEditor } from "./qa-entries-editor";
import type { Speaker } from "@/repositories/speaker-repository";
import { SPEAKER_LINK_FIELDS } from "@/lib/speaker-links";
import {
  renameEventAction,
  updateEventDetailsAction,
  createSpeakerAction,
  updateSpeakerAction,
  deleteSpeakerAction,
  createSponsorAction,
  updateSponsorAction,
  deleteSponsorAction,
  createSessionAction,
  deleteSessionAction,
  createEventInfoSectionAction,
  updateEventInfoSectionAction,
  deleteEventInfoSectionAction,
} from "./actions";

const TIERS = ["diamond", "platinum", "gold", "silver", "bronze", "a_la_carte"] as const;

// What a More Info row does when tapped: open its own page (text, or questions
// and answers), or jump to one of the app's existing screens.
function RowTypeSelect({ defaultValue }: { defaultValue: RowType }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">When tapped</span>
      <select name="rowType" defaultValue={defaultValue} className="rounded border px-3 py-2">
        {ROW_TYPE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.types.map((type) => (
              <option key={type} value={type}>
                {rowTypeLabel(type)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function FormattingHint() {
  return (
    <p className="text-xs text-zinc-500">
      Plain text works — a blank line starts a new paragraph. You can also use these tags:{" "}
      <code>&lt;p&gt; &lt;h1&gt;–&lt;h6&gt; &lt;strong&gt; (or &lt;b&gt;) &lt;em&gt; (or &lt;i&gt;) &lt;br&gt; &lt;ol&gt;&lt;li&gt;</code>
      , and links as <code>&lt;a href=&quot;https://…&quot;&gt;text&lt;/a&gt;</code> (https, mailto: or tel:).
      Anything else is rejected when you save.
    </p>
  );
}

// Link inputs shared by the add and edit speaker forms. Names match the
// SPEAKER_LINK_FIELDS keys, which readSpeakerLinks() reads back.
function SpeakerLinkInputs({ speaker }: { speaker?: Speaker }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-zinc-500">Links (optional)</legend>
      {SPEAKER_LINK_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex items-center gap-2">
          <label htmlFor={`${speaker?.id ?? "new"}-${key}`} className="w-24 shrink-0 text-sm">
            {label}
          </label>
          <input
            id={`${speaker?.id ?? "new"}-${key}`}
            name={key}
            defaultValue={speaker?.[key] ?? ""}
            placeholder={placeholder}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      ))}
    </fieldset>
  );
}

const TABS = [
  { key: "details", label: "Event details" },
  { key: "sessions", label: "Sessions" },
  { key: "speakers", label: "Speakers" },
  { key: "sponsors", label: "Sponsors" },
  { key: "my-event", label: "More Info" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

function formatEventDates(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const start = new Date(`${startsAt}T00:00:00`);
  const startText = start.toLocaleDateString(undefined, { dateStyle: "long" });
  if (!endsAt || endsAt === startsAt) return startText;
  const end = new Date(`${endsAt}T00:00:00`);
  const endText = end.toLocaleDateString(undefined, { dateStyle: "long" });
  return `${startText} – ${endText}`;
}

export default async function EventContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; tab?: string; open?: string }>;
}) {
  const { eventId } = await params;
  const { error, tab: rawTab, open: openSectionId } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "details";
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
  const infoSectionRepo = new SupabaseEventInfoSectionRepository(supabase);
  const qaRepo = new SupabaseQaEntryRepository(supabase);

  const [speakers, sponsors, sessions, infoSections, qaEntries] = await Promise.all([
    speakerRepo.listByEvent(eventId),
    sponsorRepo.listByEvent(eventId),
    sessionRepo.listByEvent(eventId),
    infoSectionRepo.listByEvent(eventId),
    // Before migration 0019 has been run the Q&A table doesn't exist; the rest
    // of the page should still load.
    qaRepo.listByEvent(eventId).catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-10">
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

      <div className="flex gap-8">
        <nav className="w-48 shrink-0 space-y-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/events/${eventId}?tab=${t.key}`}
              className={`block rounded px-3 py-2 text-sm ${
                activeTab === t.key ? "bg-black font-medium text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 space-y-3">
          {activeTab === "details" && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Event details</h2>
              <p className="text-sm text-zinc-500">
                Shown to attendees in the mobile app — logo, dates, location, and a short
                description of the event.
              </p>
              <div className="flex items-start gap-4">
                {event.logoUrl && (
                  <Image
                    src={event.logoUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded object-contain"
                  />
                )}
                <form
                  action={updateEventDetailsAction.bind(null, eventId)}
                  className="flex-1 space-y-3"
                >
                  <div className="space-y-1">
                    <label htmlFor="event-logo" className="text-xs font-medium text-zinc-500">
                      {event.logoUrl ? "Replace logo/image" : "Logo/image (optional)"}
                    </label>
                    <input id="event-logo" name="logo" type="file" accept="image/*" className="block text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="event-primary-color" className="text-xs font-medium text-zinc-500">
                      Accent color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="event-primary-color"
                        name="primaryColor"
                        type="color"
                        defaultValue={event.primaryColor ?? "#ac9245"}
                        className="h-9 w-14 rounded border p-1"
                      />
                      <p className="text-xs text-zinc-500">
                        The one brand color used throughout the mobile app (tab bar, buttons,
                        highlights). Defaults to the house gold if never changed.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="event-tagline" className="text-xs font-medium text-zinc-500">
                      Tagline
                    </label>
                    <input
                      id="event-tagline"
                      name="tagline"
                      defaultValue={event.tagline}
                      placeholder="A short line under the event name"
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <label htmlFor="event-starts" className="text-xs font-medium text-zinc-500">
                        Starts
                      </label>
                      <input
                        id="event-starts"
                        name="startsAt"
                        type="date"
                        defaultValue={event.startsAt ?? ""}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label htmlFor="event-ends" className="text-xs font-medium text-zinc-500">
                        Ends
                      </label>
                      <input
                        id="event-ends"
                        name="endsAt"
                        type="date"
                        defaultValue={event.endsAt ?? ""}
                        className="w-full rounded border px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="event-location" className="text-xs font-medium text-zinc-500">
                      Location / address
                    </label>
                    <input
                      id="event-location"
                      name="location"
                      defaultValue={event.location}
                      placeholder="Venue name, city"
                      className="w-full rounded border px-3 py-2"
                    />
                    <p className="text-xs text-zinc-500">
                      Shown in the More Info screen&apos;s Location block. Tapping it opens this address in
                      the phone&apos;s Maps app, so include the street address.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="event-location-image" className="text-xs font-medium text-zinc-500">
                      {event.locationImageUrl ? "Replace location image" : "Location image (optional)"}
                    </label>
                    {event.locationImageUrl && (
                      <Image
                        src={event.locationImageUrl}
                        alt="Location"
                        width={240}
                        height={120}
                        className="h-24 w-48 rounded object-cover"
                      />
                    )}
                    <input
                      id="event-location-image"
                      name="locationImage"
                      type="file"
                      accept="image/*"
                      className="block text-sm"
                    />
                    <p className="text-xs text-zinc-500">
                      A picture of the venue area (a map screenshot works well), shown above the address.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="event-description" className="text-xs font-medium text-zinc-500">
                      About this event (short excerpt)
                    </label>
                    <textarea
                      id="event-description"
                      name="description"
                      defaultValue={event.description}
                      placeholder="A few sentences describing the event"
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-zinc-500">
                      Home screen banner (2 slides, shown above the mobile app&apos;s menu)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        {event.banner1ImageUrl && (
                          <Image
                            src={event.banner1ImageUrl}
                            alt=""
                            width={320}
                            height={80}
                            className="h-20 w-full rounded border object-cover"
                          />
                        )}
                        <input name="banner1Image" type="file" accept="image/*" className="block text-sm" />
                        <input
                          name="banner1Link"
                          defaultValue={event.banner1LinkUrl ?? ""}
                          placeholder="Link (optional)"
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        {event.banner2ImageUrl && (
                          <Image
                            src={event.banner2ImageUrl}
                            alt=""
                            width={320}
                            height={80}
                            className="h-20 w-full rounded border object-cover"
                          />
                        )}
                        <input name="banner2Image" type="file" accept="image/*" className="block text-sm" />
                        <input
                          name="banner2Link"
                          defaultValue={event.banner2LinkUrl ?? ""}
                          placeholder="Link (optional)"
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
                    Save details
                  </button>
                </form>
              </div>
              {(event.tagline || event.location || formatEventDates(event.startsAt, event.endsAt)) && (
                <div className="border-t pt-3 text-sm text-zinc-500">
                  {event.tagline && <p>{event.tagline}</p>}
                  {formatEventDates(event.startsAt, event.endsAt) && (
                    <p>{formatEventDates(event.startsAt, event.endsAt)}</p>
                  )}
                  {event.location && <p>{event.location}</p>}
                </div>
              )}
            </section>
          )}

          {activeTab === "sessions" && (
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
          )}

          {activeTab === "speakers" && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Speakers</h2>
              <ul className="space-y-2">
                {speakers.length === 0 && <li className="text-sm text-zinc-500">No speakers yet.</li>}
                {speakers.map((speaker) => (
                  <li key={speaker.id} className="rounded border px-4 py-3">
                    <div className="flex items-center justify-between">
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
                          <p className="font-medium">
                            {speaker.name}
                            {speaker.featured && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                Featured
                              </span>
                            )}
                          </p>
                          {speaker.title && <p className="text-xs text-zinc-500">{speaker.title}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <details className="relative">
                          <summary className="cursor-pointer text-sm underline list-none">Edit</summary>
                          <form
                            action={updateSpeakerAction.bind(null, eventId)}
                            className="mt-3 space-y-2 border-t pt-3"
                          >
                            <input type="hidden" name="speakerId" value={speaker.id} />
                            <input
                              name="name"
                              defaultValue={speaker.name}
                              required
                              className="w-full rounded border px-3 py-2"
                            />
                            <input
                              name="title"
                              defaultValue={speaker.title}
                              placeholder="Title (optional)"
                              className="w-full rounded border px-3 py-2"
                            />
                            <textarea
                              name="bio"
                              defaultValue={speaker.bio}
                              placeholder="Bio (optional)"
                              className="w-full rounded border px-3 py-2"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="featured"
                                defaultChecked={speaker.featured}
                              />
                              Featured
                            </label>
                            <SpeakerLinkInputs speaker={speaker} />
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-zinc-500">
                                Replace photo (optional)
                              </label>
                              <input name="photo" type="file" accept="image/*" className="block text-sm" />
                            </div>
                            <button
                              type="submit"
                              className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
                            >
                              Save
                            </button>
                          </form>
                        </details>
                        <form action={deleteSpeakerAction.bind(null, eventId)}>
                          <input type="hidden" name="speakerId" value={speaker.id} />
                          <button type="submit" className="text-sm text-zinc-500 underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <form action={createSpeakerAction.bind(null, eventId)} className="space-y-2 border-t pt-4">
                <input name="name" placeholder="Name" required className="w-full rounded border px-3 py-2" />
                <input name="title" placeholder="Title (optional)" className="w-full rounded border px-3 py-2" />
                <textarea name="bio" placeholder="Bio (optional)" className="w-full rounded border px-3 py-2" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="featured" />
                  Featured
                </label>
                <SpeakerLinkInputs />
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
          )}

          {activeTab === "sponsors" && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Sponsors</h2>
              <ul className="space-y-2">
                {sponsors.length === 0 && <li className="text-sm text-zinc-500">No sponsors yet.</li>}
                {sponsors.map((sponsor) => (
                  <li key={sponsor.id} className="rounded border px-4 py-3">
                    <div className="flex items-center justify-between">
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
                      <div className="flex items-center gap-3">
                        <details className="relative">
                          <summary className="cursor-pointer text-sm underline list-none">Edit</summary>
                          <form
                            action={updateSponsorAction.bind(null, eventId)}
                            className="mt-3 space-y-2 border-t pt-3"
                          >
                            <input type="hidden" name="sponsorId" value={sponsor.id} />
                            <input
                              name="name"
                              defaultValue={sponsor.name}
                              required
                              className="w-full rounded border px-3 py-2"
                            />
                            <select
                              name="tier"
                              defaultValue={sponsor.tier}
                              className="w-full rounded border px-3 py-2"
                            >
                              {TIERS.map((tier) => (
                                <option key={tier} value={tier}>
                                  {tier.replace("_", " ")}
                                </option>
                              ))}
                            </select>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-zinc-500">
                                Replace logo (optional)
                              </label>
                              <input name="logo" type="file" accept="image/*" className="block text-sm" />
                            </div>
                            <button
                              type="submit"
                              className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
                            >
                              Save
                            </button>
                          </form>
                        </details>
                        <form action={deleteSponsorAction.bind(null, eventId)}>
                          <input type="hidden" name="sponsorId" value={sponsor.id} />
                          <button type="submit" className="text-sm text-zinc-500 underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
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
          )}

          {activeTab === "my-event" && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">More Info content</h2>
              <p className="text-sm text-zinc-500">
                Rows shown on the &quot;More Info&quot; tab in the mobile app (About, Getting here,
                Emergency info, etc). Tapping a row opens its own page, or an existing screen like
                Speakers. Read-only for attendees.
              </p>
              <ul className="space-y-2">
                {infoSections.length === 0 && (
                  <li className="text-sm text-zinc-500">No sections yet.</li>
                )}
                {infoSections.map((section) => {
                  const rowType = rowTypeOf(section);
                  const sectionEntries = qaEntries.filter((e) => e.sectionId === section.id);
                  return (
                  <li key={section.id} className="rounded border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{section.title}</p>
                        <p className="text-xs text-zinc-500">
                          {section.icon}
                          {isScreenRowType(rowType) ? ` · opens the ${rowTypeLabel(rowType)} screen` : ""}
                          {rowType === "qa"
                            ? ` · Q&A page (${sectionEntries.length} ${sectionEntries.length === 1 ? "question" : "questions"})`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <details className="relative" open={openSectionId === section.id}>
                          <summary className="cursor-pointer text-sm underline list-none">Edit</summary>
                          <form
                            action={updateEventInfoSectionAction.bind(null, eventId)}
                            className="mt-3 space-y-2 border-t pt-3"
                          >
                            <input type="hidden" name="sectionId" value={section.id} />
                            <select name="icon" defaultValue={section.icon} className="rounded border px-3 py-2">
                              {EVENT_INFO_SECTION_ICONS.map((icon) => (
                                <option key={icon} value={icon}>
                                  {icon}
                                </option>
                              ))}
                            </select>
                            <input
                              name="title"
                              defaultValue={section.title}
                              required
                              className="w-full rounded border px-3 py-2"
                            />
                            <RowTypeSelect defaultValue={rowType} />
                            {rowType === "text" && (
                              <>
                                <textarea
                                  name="body"
                                  defaultValue={section.body}
                                  placeholder="Body (optional)"
                                  rows={6}
                                  className="w-full rounded border px-3 py-2"
                                />
                                <FormattingHint />
                              </>
                            )}
                            {rowType !== "text" && (
                              <p className="text-xs text-zinc-500">
                                {rowType === "qa"
                                  ? "Add and order the questions in the section below."
                                  : `This row opens the ${rowTypeLabel(rowType)} screen, so it has no page text.`}{" "}
                                Change the type and save to see that type&apos;s fields.
                              </p>
                            )}
                            <button
                              type="submit"
                              className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
                            >
                              Save
                            </button>
                          </form>
                          {rowType === "qa" && (
                            <QaEntriesEditor eventId={eventId} sectionId={section.id} entries={sectionEntries} />
                          )}
                        </details>
                        <form action={deleteEventInfoSectionAction.bind(null, eventId)}>
                          <input type="hidden" name="sectionId" value={section.id} />
                          <button type="submit" className="text-sm text-zinc-500 underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
              <form
                action={createEventInfoSectionAction.bind(null, eventId)}
                className="space-y-2 border-t pt-4"
              >
                <div className="flex items-end gap-2">
                  <input
                    name="title"
                    placeholder="Title"
                    required
                    className="flex-1 rounded border px-3 py-2"
                  />
                  <select name="icon" className="rounded border px-3 py-2" defaultValue="info">
                    {EVENT_INFO_SECTION_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <RowTypeSelect defaultValue="text" />
                <textarea
                  name="body"
                  placeholder="Body (optional) — used by text pages only"
                  rows={6}
                  className="w-full rounded border px-3 py-2"
                />
                <FormattingHint />
                <p className="text-xs text-zinc-500">
                  For a Q&amp;A page, add the row first, then click Edit to add its questions.
                </p>
                <button type="submit" className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800">
                  Add section
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
