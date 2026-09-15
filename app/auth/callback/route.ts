import { NextResponse } from "next/server";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server-component-client";
import { cygnusUrl, type MeResponse } from "@/lib/api/client";
import { routeForMe } from "@/lib/auth/nextRoute";

/**
 * Lands both Google OAuth and email-confirmation-link redirects.
 *
 * Not unit-tested: it depends on `next/headers`, which only works inside a
 * real Next request — exercising it means calling exported GET() directly,
 * which throws outside that context. `routeForMe`, the one piece of actual
 * decision logic here, is pulled out and tested on its own in
 * `lib/auth/__tests__/nextRoute.test.ts`; this file is thin glue around it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }

  let me: MeResponse | null = null;
  try {
    const meResponse = await fetch(`${cygnusUrl()}/v1/me`, {
      headers: { authorization: `Bearer ${data.session.access_token}` },
    });
    if (meResponse.ok) {
      me = (await meResponse.json()) as MeResponse;
    }
  } catch (fetchError) {
    console.error("GET /auth/callback: could not read /v1/me", fetchError);
  }

  return NextResponse.redirect(new URL(routeForMe(me), url.origin));
}
