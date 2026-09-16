import { authedFetch } from "@/lib/api/authedFetch";
import { problem } from "@/lib/api/problem";

/**
 * Records a click on the quota wall (UI_PRD §6.8) — no payment, no Stripe.
 * `profile_id` comes only from the verified token on Cygnus's side.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  return authedFetch(request, "/v1/billing/intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
