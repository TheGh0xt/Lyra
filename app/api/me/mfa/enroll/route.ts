import { authedFetch } from "@/lib/api/authedFetch";

/** Starts TOTP enrollment; the secret and QR URI are shown exactly once. */
export async function POST(request: Request) {
  return authedFetch(request, "/v1/me/mfa/enroll", { method: "POST" });
}
