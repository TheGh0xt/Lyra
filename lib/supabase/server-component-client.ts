import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * A Supabase client for Server Components and layouts — reads the session
 * cookie via `next/headers`.
 *
 * Not used by Route Handlers (see `route-client.ts`): `next/headers` only
 * works inside Next's own request context, which makes a handler untestable
 * by calling its exported GET/POST directly. Server Components render only
 * inside that context anyway, so there's nothing to lose here.
 */
export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component render can't set cookies; `proxy.ts` refreshes
          // the session on navigation instead.
        }
      },
    },
  });
}
