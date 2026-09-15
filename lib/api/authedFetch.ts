import { cygnusUrl } from "./client";
import { problem } from "./problem";
import { getAccessToken } from "@/lib/supabase/route-client";

/**
 * Proxies one `/v1/*` call to Cygnus with the caller's Supabase token
 * attached, for every Cygnus route that requires auth.
 *
 * Missing session is a 401 from this app, not from Cygnus — Cygnus never
 * sees the request, so it can't be the one to say so. A present-but-invalid
 * or expired token, on the other hand, still reaches Cygnus and comes back
 * as whatever Cygnus's own auth gate says (fail-closed, per B.6) — this
 * function only handles the "we have nothing to send" case itself.
 */
export async function authedFetch(request: Request, path: string, init: RequestInit = {}) {
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

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(`authedFetch ${path}: upstream fetch failed`, error);
    return problem("sagittarius-unavailable", "The service is unreachable.", 502);
  }
}
