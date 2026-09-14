import { requestResetCode } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-zinc-600">
          Enter your email and we&apos;ll send you a one-time code.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {sent && (
          <p className="text-sm text-zinc-600">
            Code sent — check your email, then enter it on the next page.
          </p>
        )}
        <form action={requestResetCode} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            Send code
          </button>
        </form>
      </div>
    </div>
  );
}
