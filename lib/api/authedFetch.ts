import { cygnusUrl } from "./client";
import { problem } from "./problem";
import { getAccessToken } from "@/lib/supabase/route-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Statuses the Fetch spec calls "null body status". Passing *any* body to the
 * `Response` constructor with one of these — including the empty string that
 * `upstream.text()` returns — throws `TypeError: Response constructor: Invalid
 * response status code 204`.
 *
 * @see https://fetch.spec.whatwg.org/#null-body-status
 */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * Rebuilds an upstream Cygnus response as one this route can return.
 *
 * Exported for tests: the bug this exists to prevent is only reachable through
 * a *real* upstream `Response`, and mocking one with `new Response(null, {status:
 * 204})` — as the previous tests did — cannot reproduce it, because the empty
 * string body is introduced here, not by the caller.
 */
export async function relay(upstream: Response): Promise<Response> {
  // Read the body first either way: leaving it undrained leaks the connection
  // back to the pool unusable.
  const body = await upstream.text();

  if (NULL_BODY_STATUSES.has(upstream.status)) {
    return new Response(null, { status: upstream.status });
  }

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

/**
 * Proxies one `/v1/*` call to Cygnus with the caller's Supabase token
 * attached, for every Cygnus route that requires auth.
 *
 * Missing session is a 401 from this app, not from Cygnus — Cygnus never
 * sees the request, so it can't be the one to say so. A present-but-invalid
 * or expired token, on the other hand, still reaches Cygnus and comes back
 * as whatever Cygnus's own auth gate says (fail-closed, per B.6) — this
 * function only handles the "we have nothing to send" case itself.
 *
 * A *missing Supabase config* is deliberately not the same case: unlike
 * `proxy.ts` (which fails soft, since most of the site needs no session),
 * an authenticated route has no soft option — treating "auth is
 * misconfigured" as "not signed in" would tell the caller to do something
 * (sign in) that can't fix it, and would hide a deploy-config bug behind a
 * routine-looking 401.
 */
export async function authedFetch(request: Request, path: string, init: RequestInit = {}) {
  if (!isSupabaseConfigured()) {
    console.error(`authedFetch ${path}: Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)`);
    return problem("internal-error", "Authentication is not configured.", 503);
  }

  const token = await getAccessToken(request);
  if (!token) {
    return problem("unauthorized", "Sign in to continue.", 401);
  }

  try {
    const upstream = await fetch(`${cygnusUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        authorization: `Bearer ${token}`,
      },
    });

    return relay(upstream);
  } catch (error) {
    console.error(`authedFetch ${path}: upstream fetch failed`, error);
    return problem("sagittarius-unavailable", "The service is unreachable.", 502);
  }
}
