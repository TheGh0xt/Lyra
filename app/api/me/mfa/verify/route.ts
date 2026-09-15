import { authedFetch } from "@/lib/api/authedFetch";
import { problem } from "@/lib/api/problem";

/** Confirms a TOTP code against a factor started by `POST /me/mfa/enroll`. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  return authedFetch(request, "/v1/me/mfa/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
