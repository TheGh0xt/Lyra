import { authedFetch } from "@/lib/api/authedFetch";
import { problem } from "@/lib/api/problem";

/**
 * Starts an analysis.
 *
 * Authenticated since Cygnus's B.6 auth gate landed — `POST /v1/analyses`
 * has no public or optional-auth entry, so an anonymous call 401s upstream
 * regardless. `authedFetch` makes that this app's own 401 instead, and
 * carries the caller's quota/invite state through to Cygnus's 403s
 * (quota-exceeded, not-invited) — B.17 renders the paywall from that 403
 * rather than counting analyses client-side.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  return authedFetch(request, "/v1/analyses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
