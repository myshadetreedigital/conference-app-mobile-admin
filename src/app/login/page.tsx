import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Log in</h1>
        {message && <p className="text-sm text-zinc-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form action={login} className="space-y-4">
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
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            Log in
          </button>
        </form>
        <div className="flex justify-between text-sm text-zinc-600">
          <Link href="/register" className="underline">
            Create an account
          </Link>
          <Link href="/reset-password" className="underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
