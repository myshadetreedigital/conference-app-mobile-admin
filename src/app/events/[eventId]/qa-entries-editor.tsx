import type { QaEntry } from "@/repositories/qa-entry-repository";
import { MAX_ANSWER_LENGTH, MAX_QUESTION_LENGTH } from "@/services/qa-entry-service";
import {
  createQaEntryAction,
  deleteQaEntryAction,
  moveQaEntryAction,
  updateQaEntryAction,
} from "./actions";

// The question-and-answer pairs of one More Info row whose type is "Q&A page".
// On the phone they appear in this order, numbered, each on an alternating band.
// Every control is its own small form, so saving one pair never touches another.
export function QaEntriesEditor({
  eventId,
  sectionId,
  entries,
}: {
  eventId: string;
  sectionId: string;
  entries: QaEntry[];
}) {
  return (
    <div className="mt-4 space-y-3 border-t pt-3">
      <div>
        <p className="text-sm font-medium">Questions and answers</p>
        <p className="text-xs text-zinc-500">
          Shown in this order, numbered, each pair on an alternating band. Questions are plain text.
          Answers can use plain text (a blank line starts a new paragraph) or the tags &lt;strong&gt;,
          &lt;em&gt;, &lt;br&gt;, &lt;ol&gt;&lt;li&gt; and &lt;a href=&quot;https://…&quot;&gt; (https, mailto: or
          tel:). Anything else is rejected when you save.
        </p>
      </div>

      {entries.length === 0 && <p className="text-sm text-zinc-500">No questions yet.</p>}

      <ol className="space-y-3">
        {entries.map((entry, index) => (
          <li key={entry.id} className="space-y-2 rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{index + 1}.</span>
              <div className="flex items-center gap-2">
                {(["up", "down"] as const).map((direction) => {
                  const atEnd = direction === "up" ? index === 0 : index === entries.length - 1;
                  return (
                    <form key={direction} action={moveQaEntryAction.bind(null, eventId)}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input type="hidden" name="sectionId" value={sectionId} />
                      <input type="hidden" name="direction" value={direction} />
                      <button
                        type="submit"
                        disabled={atEnd}
                        aria-label={`Move question ${index + 1} ${direction}`}
                        className="rounded border px-2 py-1 text-sm disabled:opacity-30"
                      >
                        {direction === "up" ? "↑" : "↓"}
                      </button>
                    </form>
                  );
                })}
                <form action={deleteQaEntryAction.bind(null, eventId)}>
                  <input type="hidden" name="entryId" value={entry.id} />
                  <input type="hidden" name="sectionId" value={sectionId} />
                  <button type="submit" className="text-sm text-zinc-500 underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <form action={updateQaEntryAction.bind(null, eventId)} className="space-y-2">
              <input type="hidden" name="entryId" value={entry.id} />
              <input type="hidden" name="sectionId" value={sectionId} />
              <input
                name="question"
                defaultValue={entry.question}
                required
                maxLength={MAX_QUESTION_LENGTH}
                aria-label={`Question ${index + 1}`}
                className="w-full rounded border px-3 py-2"
              />
              <textarea
                name="answer"
                defaultValue={entry.answer}
                rows={4}
                maxLength={MAX_ANSWER_LENGTH}
                aria-label={`Answer ${index + 1}`}
                className="w-full rounded border px-3 py-2"
              />
              <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-zinc-800">
                Save
              </button>
            </form>
          </li>
        ))}
      </ol>

      <form action={createQaEntryAction.bind(null, eventId)} className="space-y-2 rounded border border-dashed p-3">
        <input type="hidden" name="sectionId" value={sectionId} />
        <p className="text-sm font-medium">Add a question</p>
        <input
          name="question"
          placeholder="Question"
          required
          maxLength={MAX_QUESTION_LENGTH}
          className="w-full rounded border px-3 py-2"
        />
        <textarea
          name="answer"
          placeholder="Answer"
          rows={4}
          maxLength={MAX_ANSWER_LENGTH}
          className="w-full rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-zinc-800">
          Add question
        </button>
      </form>
    </div>
  );
}
