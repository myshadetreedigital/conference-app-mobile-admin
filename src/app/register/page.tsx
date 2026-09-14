import Link from "next/link";
import { register } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <form action={register} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="firstName" className="text-sm font-medium">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last name
              </label>
              <input id="lastName" name="lastName" className="w-full rounded border px-3 py-2" />
            </div>
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
              minLength={8}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            Register
          </button>
        </form>
        <p className="text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
