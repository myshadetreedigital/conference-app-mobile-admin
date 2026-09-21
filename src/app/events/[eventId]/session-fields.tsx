import { isoToZonedLocal } from "@/lib/event-time";
import type { Session } from "@/repositories/session-repository";
import type { Speaker } from "@/repositories/speaker-repository";

/** The inputs shared by the add-session and edit-session forms; `session` fills them in when editing. */
export function SessionFields({
  idPrefix,
  session,
  speakers,
  timeZone,
}: {
  idPrefix: string;
  session?: Session;
  /** The event's time zone: the clock the times are typed and shown in. */
  timeZone: string;
  speakers: Pick<Speaker, "id" | "name">[];
}) {
  return (
    <>
      <input
        name="title"
        placeholder="Title"
        defaultValue={session?.title}
        required
        className="w-full rounded border px-3 py-2"
      />
      <p className="text-xs text-zinc-500">Times are in the event&apos;s time zone: {timeZone.replaceAll("_", " ")}.</p>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor={`${idPrefix}-startsAt`} className="text-xs font-medium text-zinc-500">
            Starts
          </label>
          <input
            id={`${idPrefix}-startsAt`}
            name="startsAt"
            type="datetime-local"
            defaultValue={isoToZonedLocal(session?.startsAt ?? null, timeZone)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label htmlFor={`${idPrefix}-endsAt`} className="text-xs font-medium text-zinc-500">
            Ends
          </label>
          <input
            id={`${idPrefix}-endsAt`}
            name="endsAt"
            type="datetime-local"
            defaultValue={isoToZonedLocal(session?.endsAt ?? null, timeZone)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </div>
      <input
        name="location"
        placeholder="Location (optional)"
        defaultValue={session?.location}
        className="w-full rounded border px-3 py-2"
      />
      <textarea
        name="description"
        placeholder="Description (optional)"
        defaultValue={session?.description}
        className="w-full rounded border px-3 py-2"
      />
      <fieldset className="space-y-1">
        <legend className="text-xs font-medium text-zinc-500">Speakers</legend>
        {speakers.length === 0 ? (
          <p className="text-sm text-zinc-500">Add speakers in the Speakers tab, then choose them here.</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {speakers.map((speaker) => (
              <label key={speaker.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="speakerIds"
                  value={speaker.id}
                  defaultChecked={session?.speakerIds.includes(speaker.id) ?? false}
                />
                {speaker.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );
}
