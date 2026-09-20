"use client";

import { useId, useState } from "react";
import { filterIconGroups, iconDetails } from "@/lib/section-icons";

/** One icon, drawn from its path data. Decorative — the label is on the control that holds it. */
export function SectionIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
      <path d={iconDetails(name).path} />
    </svg>
  );
}

/**
 * Icon chooser for a More Info row: shows the current icon, and opens a panel of
 * every icon (about 110) in groups, with a search box. It stores its choice in a
 * hidden input named "icon", so it submits with the form like any other field.
 * Runs entirely in the browser.
 */
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const groups = filterIconGroups(query);
  const current = iconDetails(value);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      // Close when focus leaves the whole control (clicking or tabbing elsewhere).
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input type="hidden" name="icon" value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Icon: ${current.label}. Change`}
        className="flex items-center gap-2 rounded border px-3 py-2"
      >
        <SectionIcon name={value} />
        <span className="text-sm">{current.label}</span>
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute left-0 z-20 mt-1 w-[22rem] max-w-[90vw] space-y-3 rounded border bg-white p-3 shadow-lg"
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons (e.g. hotel, coffee, parking)"
            aria-label="Search icons"
            autoFocus
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {groups.length === 0 && <p className="text-sm text-zinc-500">No icons match “{query.trim()}”.</p>}
            {groups.map((group) => (
              <div key={group.label} role="radiogroup" aria-label={group.label} className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">{group.label}</p>
                <div className="grid grid-cols-6 gap-1">
                  {group.icons.map(({ key, details }) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={key === value}
                      aria-label={details.label}
                      title={details.label}
                      onClick={() => choose(key)}
                      className={`flex h-10 items-center justify-center rounded hover:bg-zinc-100 ${
                        key === value ? "bg-zinc-200 ring-2 ring-black" : ""
                      }`}
                    >
                      <SectionIcon name={key} size={22} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
