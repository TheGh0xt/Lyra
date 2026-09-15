import { authedFetch } from "@/lib/api/authedFetch";

/** Whether the signed-in user has a verified TOTP factor. */
export async function GET(request: Request) {
  return authedFetch(request, "/v1/me/mfa");
}
