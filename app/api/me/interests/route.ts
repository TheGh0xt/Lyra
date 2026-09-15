import { authedFetch } from "@/lib/api/authedFetch";
import { problem } from "@/lib/api/problem";

/** Sets the signed-in user's 3-5 interest categories (UI_PRD §6.3). */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  return authedFetch(request, "/v1/me/interests", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
