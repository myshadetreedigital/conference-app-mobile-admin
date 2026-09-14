"use client";

import { useActionState } from "react";
import { createOrganizationAction, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);
  const isDuplicateWarning = Boolean(state.duplicateOfId);

  return (
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Set up your organization</h1>
      <p className="text-sm text-zinc-600">
        This can be a business or a personal event — whatever you&apos;re organizing.
      </p>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {isDuplicateWarning && (
        <div className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          This looks similar to an organization we already have on file. You can continue
          anyway if it&apos;s a separate organization.
        </div>
      )}
      <form action={formAction} className="space-y-4">
        {isDuplicateWarning && <input type="hidden" name="confirmDespiteDuplicate" value="1" />}
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Organization name
          </label>
          <input id="name" name="name" required className="w-full rounded border px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <input id="phone" name="phone" required className="w-full rounded border px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="address" className="text-sm font-medium">
            Address <span className="text-zinc-400">(optional)</span>
          </label>
          <input id="address" name="address" className="w-full rounded border px-3 py-2" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Working…" : isDuplicateWarning ? "Continue anyway" : "Create organization"}
        </button>
      </form>
    </div>
  );
}
