import { authedFetch } from "@/lib/api/authedFetch";
import { problem } from "@/lib/api/problem";

/**
 * Records a product event — a UI-mode switch or an analysis start (B.19).
 *
 * `POST /v1/events` is also how `ui_mode` gets persisted on the profile:
 * Cygnus's handler writes it whenever `name === "ui_mode_switched"` and
 * `ui_mode` is set, alongside logging the event itself. There is no
 * separate "set my UI mode" endpoint in the contract.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  return authedFetch(request, "/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
