import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase session cookie on every navigation (B.16).
 *
 * Supabase access tokens are short-lived; without this, a session silently
 * goes stale mid-visit and the next `/api/*` call 401s for no reason the
 * user can see. Named `proxy.ts`, not `middleware.ts` — Next 16 renamed the
 * convention (see AGENTS.md: this isn't the Next.js you know).
 */
export async function proxy(request: NextRequest) {
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
