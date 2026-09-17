import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { isProtectedPath } from "@/lib/auth/protectedRoutes";

/**
 * Refreshes the Supabase session cookie on every navigation (B.16), and
 * gates the authenticated area of the app (B.17).
 *
 * Supabase access tokens are short-lived; without the refresh, a session
 * silently goes stale mid-visit and the next `/api/*` call 401s for no
 * reason the user can see. Named `proxy.ts`, not `middleware.ts` — Next 16
 * renamed the convention (see AGENTS.md: this isn't the Next.js you know).
 *
 * The redirect is a courtesy, not the security boundary — `authedFetch`
 * still 401s every protected `/api/*` route on its own regardless of what
 * page got there, so a bug here can't open a hole, only a confusing page.
 *
 * That is also why a missing Supabase config fails soft here rather than
 * loud (F10): this runs on every request the matcher below covers —
 * effectively the whole site, including the public landing page and the
 * waitlist, neither of which needs a session at all. A missing
 * `NEXT_PUBLIC_SUPABASE_*` var previously made `supabaseUrl()` /
 * `supabaseAnonKey()` throw here, taking down every path with a 500,
 * session required or not. Passing through unauthenticated cannot open a
 * hole for the reason above; an authenticated route still needs its own
 * clear "not configured" error rather than silently pretending to work —
 * see `authedFetch.ts`.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
