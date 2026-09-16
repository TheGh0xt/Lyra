import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase session cookie on every navigation (B.16).
 *
 * Supabase access tokens are short-lived; without this, a session silently
 * goes stale mid-visit and the next `/api/*` call 401s for no reason the
 * user can see. Named `proxy.ts`, not `middleware.ts` — Next 16 renamed the
 * convention (see AGENTS.md: this isn't the Next.js you know).
 *
 * Fails soft on a missing Supabase config, not loud: this runs on every
 * request the matcher below covers — effectively the whole site, including
 * the public landing page and the waitlist, neither of which needs a
 * session at all. A missing `NEXT_PUBLIC_SUPABASE_*` var previously made
 * `supabaseUrl()`/`supabaseAnonKey()` throw here, which took down every
 * path with a 500, session or no session required. Session refresh is a
 * courtesy on top of a page that already works without one; an
 * authenticated route or page still needs its own clear "not configured"
 * error rather than silently pretending to work — see `authedFetch.ts`.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    console.error(
      "proxy: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY not set — passing the request through without a session refresh",
    );
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // The call itself is what triggers a refresh when the token is stale;
  // the value isn't otherwise needed here.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
