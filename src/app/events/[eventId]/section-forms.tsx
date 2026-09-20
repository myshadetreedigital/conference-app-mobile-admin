"use client";

import { useActionState, useId, useState } from "react";
import {
  addPair,
  editPair,
  initialPairs,
  movePair,
  pairTitle,
  removePair,
  setAllOpen,
  togglePair,
  type StoredPair,
} from "@/lib/qa-pair-list";
import { MAX_ANSWER_LENGTH, MAX_QA_PAIRS, MAX_QUESTION_LENGTH } from "@/lib/qa-limits";
import { pageFieldsFor, ROW_TYPE_GROUPS, rowTypeLabel, type RowType } from "@/lib/row-type";
import { IconPicker } from "./icon-picker";

// The add and edit forms for a More Info row. These run in the browser so the form
// can react the instant something changes, with no trip to the server:
//   * picking a type in "When tapped" swaps the inputs at once (a text box for a
//     text page, question-and-answer boxes for a Q&A page, nothing for an existing
//     screen) — for a new row and a saved one alike;
//   * question-and-answer pairs are added, removed, reordered and collapsed here;
//   * everything typed is kept in browser state, so a problem reported on Save
//     never wipes what was entered.
// Nothing is stored until Save, which sends the row and all its pairs together.

export type SectionFormState = { error?: string };
type FormAction = (previous: SectionFormState, formData: FormData) => Promise<SectionFormState>;

const field = "w-full rounded border px-3 py-2";
const smallButton = "rounded border px-2 py-1 text-sm disabled:opacity-30";

export function FormattingHint() {
  return (
    <p className="text-xs text-zinc-500">
      Plain text works — a blank line starts a new paragraph. You can also use these tags:{" "}
      <code>&lt;p&gt; &lt;h1&gt;–&lt;h6&gt; &lt;strong&gt; (or &lt;b&gt;) &lt;em&gt; (or &lt;i&gt;) &lt;br&gt; &lt;ol&gt;&lt;li&gt;</code>
      , and links as <code>&lt;a href=&quot;https://…&quot;&gt;text&lt;/a&gt;</code> (https, mailto: or tel:).
      Anything else is rejected when you save.
    </p>
  );
}

interface Initial {
  /** Present when editing a saved row. */
  id?: string;
  icon: string;
  title: string;
  body: string;
  rowType: RowType;
  pairs: StoredPair[];
}

function SectionForm({
  action,
  initial,
  submitLabel,
  className,
}: {
  action: FormAction;
  initial: Initial;
  submitLabel: string;
  className: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formId = useId();

  const [icon, setIcon] = useState(initial.icon);
  const [title, setTitle] = useState(initial.title);
  const [type, setType] = useState<RowType>(initial.rowType);
  const [body, setBody] = useState(initial.body);

  const [pairs, setPairs] = useState(() => initialPairs(initial.pairs));

  const fields = pageFieldsFor(type);
  const allOpen = pairs.length > 0 && pairs.every((p) => p.open);

  return (
    <form action={formAction} className={className}>
      {initial.id && <input type="hidden" name="sectionId" value={initial.id} />}

      <div className="flex items-end gap-2">
        <input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          required
          className="flex-1 rounded border px-3 py-2"
        />
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">When tapped</span>
        <select
          name="rowType"
          value={type}
          onChange={(event) => setType(event.target.value as RowType)}
          className="rounded border px-3 py-2"
        >
          {ROW_TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map((option) => (
                <option key={option} value={option}>
                  {rowTypeLabel(option)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/*
        Everything below stays in the page (just hidden) when it doesn't apply to the
        chosen type, so switching type back and forth loses nothing, and collapsed
        pairs still submit what they hold.
      */}
      <div hidden={!fields.showBody} className="space-y-2">
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Body (optional)"
          rows={6}
          className={field}
        />
        <FormattingHint />
      </div>

      {fields.note && <p className="text-xs text-zinc-500">{fields.note}</p>}

      <div hidden={!fields.showQaPairs} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            Questions and answers <span className="font-normal text-zinc-500">({pairs.length})</span>
          </p>
          {pairs.length > 1 && (
            <button type="button" onClick={() => setPairs((p) => setAllOpen(p, !allOpen))} className="text-sm underline">
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Shown in this order, numbered, each pair on an alternating band. Questions are plain text; answers can use
          the tags above. Nothing is saved until you click {submitLabel}.
        </p>

        <ol className="space-y-2">
          {pairs.map((pair, index) => {
            const panelId = `${formId}-pair-${pair.key}`;
            return (
              <li key={pair.key} className="rounded border">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setPairs((p) => togglePair(p, pair.key))}
                    aria-expanded={pair.open}
                    aria-controls={panelId}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span aria-hidden="true" className="w-3 text-xs">
                      {pair.open ? "▾" : "▸"}
                    </span>
                    <span className="text-sm font-medium">{index + 1}.</span>
                    <span className="truncate text-sm text-zinc-600">{pairTitle(pair)}</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setPairs((p) => movePair(p, pair.key, "up"))}
                    aria-label={`Move question ${index + 1} up`}
                    className={smallButton}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === pairs.length - 1}
                    onClick={() => setPairs((p) => movePair(p, pair.key, "down"))}
                    aria-label={`Move question ${index + 1} down`}
                    className={smallButton}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairs((p) => removePair(p, pair.key))}
                    aria-label={`Remove question ${index + 1}`}
                    className="text-sm text-zinc-500 underline"
                  >
                    Remove
                  </button>
                </div>
                <div id={panelId} hidden={!pair.open} className="space-y-2 border-t p-3">
                  <input type="hidden" name="qaId" value={pair.id} />
                  <input
                    name="qaQuestion"
                    value={pair.question}
                    onChange={(event) => setPairs((p) => editPair(p, pair.key, { question: event.target.value }))}
                    placeholder="Question"
                    maxLength={MAX_QUESTION_LENGTH}
                    aria-label={`Question ${index + 1}`}
                    className={field}
                  />
                  <textarea
                    name="qaAnswer"
                    value={pair.answer}
                    onChange={(event) => setPairs((p) => editPair(p, pair.key, { answer: event.target.value }))}
                    placeholder="Answer"
                    rows={4}
                    maxLength={MAX_ANSWER_LENGTH}
                    aria-label={`Answer ${index + 1}`}
                    className={field}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          disabled={pairs.length >= MAX_QA_PAIRS}
          onClick={() => setPairs((p) => addPair(p))}
          className="rounded border border-dashed px-3 py-1.5 text-sm disabled:opacity-40"
        >
          + Add question
        </button>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

/** Edit form for a saved row. */
export function SectionEditForm({
  action,
  section,
  entries,
}: {
  action: FormAction;
  section: { id: string; icon: string; title: string; body: string; rowType: RowType };
  entries: StoredPair[];
}) {
  return (
    <SectionForm
      action={action}
      initial={{ ...section, pairs: entries }}
      submitLabel="Save"
      className="mt-3 space-y-3 border-t pt-3"
    />
  );
}

/** Form for adding a new row. */
export function NewSectionForm({ action }: { action: FormAction }) {
  return (
    <SectionForm
      action={action}
      initial={{ icon: "info", title: "", body: "", rowType: "text", pairs: [] }}
      submitLabel="Add section"
      className="space-y-3 border-t pt-4"
    />
  );
}
