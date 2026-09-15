import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * The caller's Supabase access token, read straight off the incoming
 * `Request`'s `Cookie` header — or `null` if they have no session.
 *
 * Deliberately not `next/headers`: a Route Handler that reads cookies that
 * way can only be exercised through Next's own server, since `cookies()`
 * throws outside a request context. Parsing the header directly means the
 * exported GET/POST can be called with a plain `Request` in a unit test,
 * matching every other route handler in `app/api/`.
 *
 * `getSession()`, not `getUser()`: this only needs the token to forward to
 * Cygnus, which verifies it itself against Supabase's JWKS. A network round
 * trip here to re-verify before re-verifying again downstream would be pure
 * waste.
 */
export async function getAccessToken(request: Request): Promise<string | null> {
  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get("cookie") ?? ""),
      setAll: () => {
        // A Route Handler forwarding a token doesn't refresh cookies itself;
        // `proxy.ts` keeps the session fresh on navigation requests.
      },
    },
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
