/**
 * Supabase project coordinates (B.16).
 *
 * Both are `NEXT_PUBLIC_` on purpose — see `.env.example`. Reading them
 * through functions rather than importing `process.env` at call sites means
 * a missing value fails loudly, at the point of use, instead of handing
 * `undefined` to the Supabase client and failing somewhere stranger later.
 */

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  return url;
}

export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  return key;
}

/**
 * A non-throwing check, for call sites that need to fail soft (a page that
 * doesn't require a session) rather than fail loud (an authenticated route,
 * which should still say clearly that auth is misconfigured — see
 * `authedFetch.ts` and `proxy.ts`).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
