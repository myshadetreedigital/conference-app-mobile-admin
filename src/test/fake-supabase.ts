import type { SupabaseClient } from "@supabase/supabase-js";

export interface RecordedOp {
  method: string;
  args: unknown[];
}

/** One `supabase.from(table)` / `supabase.rpc(name, args)` call and the builder methods chained onto it. */
export interface RecordedCall {
  root: "from" | "rpc";
  /** Table name for `from`, function name for `rpc`. */
  target: string;
  /** `rpc` params. */
  params?: unknown;
  ops: RecordedOp[];
  /** Args of the first chained call to `method` (e.g. the insert payload), or undefined if it wasn't chained. */
  arg(method: string, index?: number): unknown;
  /** Whether `method` was chained at all (e.g. to assert .select() was NOT chained after an insert). */
  has(method: string): boolean;
}

export interface FakeResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

/**
 * A stand-in for SupabaseClient for repository unit tests. Every builder
 * method (select, eq, insert, ...) is recorded and returns the same
 * chainable object, and awaiting it resolves to the scripted result — the
 * same shape PostgREST returns. Tests then assert on what the repository
 * asked for (table, filters, payload) and on how it maps the result, with
 * no network or database involved.
 *
 * This checks the repository's request shape, not that Postgres accepts it —
 * schema, constraints, and RLS are not exercised here.
 */
export function createFakeSupabase(result: FakeResult = {}) {
  const calls: RecordedCall[] = [];
  const resolved = { data: result.data ?? null, error: result.error ?? null };

  function startCall(root: "from" | "rpc", target: string, params?: unknown): object {
    const ops: RecordedOp[] = [];
    calls.push({
      root,
      target,
      params,
      ops,
      arg: (method, index = 0) => ops.find((o) => o.method === method)?.args[index],
      has: (method) => ops.some((o) => o.method === method),
    });
    const builder: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) =>
              Promise.resolve(resolved).then(onFulfilled, onRejected);
          }
          return (...args: unknown[]) => {
            ops.push({ method: String(prop), args });
            return builder;
          };
        },
      },
    );
    return builder;
  }

  const client = {
    from: (table: string) => startCall("from", table),
    rpc: (fn: string, params?: unknown) => startCall("rpc", fn, params),
  } as unknown as SupabaseClient;

  return {
    client,
    calls,
    /** The only call made; fails loudly if a repository method made zero or several. */
    only(): RecordedCall {
      if (calls.length !== 1) throw new Error(`expected exactly 1 Supabase call, got ${calls.length}`);
      return calls[0];
    },
  };
}
