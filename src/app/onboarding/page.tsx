import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrganizationRepository } from "@/repositories/supabase-organization-repository";
import { createOrganizationAction } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; duplicateOfId?: string; name?: string; phone?: string; email?: string; address?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const repo = new SupabaseOrganizationRepository(supabase);

  const existing = await repo.findByAdminUserId(user.id);
  if (existing) {
    redirect("/");
  }

  const params = await searchParams;
  const isDuplicateWarning = Boolean(params.duplicateOfId);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Set up your organization</h1>
        <p className="text-sm text-zinc-600">
          This can be a business or a personal event — whatever you&apos;re organizing.
        </p>
        {params.error && <p className="text-sm text-red-600">{params.error}</p>}
        {isDuplicateWarning && (
          <div className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            This looks similar to an organization we already have on file. You can continue
            anyway if it&apos;s a separate organization.
          </div>
        )}
        <form action={createOrganizationAction} className="space-y-4">
          {isDuplicateWarning && (
            <input type="hidden" name="confirmDespiteDuplicate" value="1" />
          )}
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Organization name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={params.name}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              required
              defaultValue={params.phone}
              className="w-full rounded border px-3 py-2"
            />
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
              defaultValue={params.email ?? user.email ?? ""}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="address" className="text-sm font-medium">
              Address <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="address"
              name="address"
              defaultValue={params.address}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            {isDuplicateWarning ? "Continue anyway" : "Create organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
