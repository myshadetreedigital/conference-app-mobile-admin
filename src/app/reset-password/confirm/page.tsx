import { confirmResetCode } from "./actions";

export default async function ConfirmResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; sent?: string }>;
}) {
  const { email = "", error, sent } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Enter your code</h1>
        {sent && (
          <p className="text-sm text-zinc-600">Code sent to {email || "your email"}.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form action={confirmResetCode} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          {!email && (
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input id="email" name="email" type="email" required className="w-full rounded border px-3 py-2" />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="code" className="text-sm font-medium">
              Code
            </label>
            <input id="code" name="code" required className="w-full rounded border px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            Reset password
          </button>
        </form>
      </div>
    </div>
  );
}
