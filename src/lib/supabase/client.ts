import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

// Use `any` for the database generic until we generate types with
// `supabase gen types typescript`. This avoids TS errors on .from() calls.
type DB = any;

let client: SupabaseClient<DB> | null = null;

export function createClient(): SupabaseClient<DB> {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (typeof window === "undefined") {
      // Build-time: return a no-op proxy so prerender doesn't crash
      const handler: ProxyHandler<any> = {
        get: (_, prop) => {
          if (prop === "then") return undefined;
          return (..._args: any[]) =>
            new Proxy({ data: null, error: null, count: 0 }, handler);
        },
      };
      return new Proxy({}, handler) as SupabaseClient<DB>;
    }
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  client = createSupabaseClient<DB>(url, key);
  return client;
}
