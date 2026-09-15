import { authedFetch } from "@/lib/api/authedFetch";

/** The signed-in user's profile — onboarding status, interests, usage. */
export async function GET(request: Request) {
  return authedFetch(request, "/v1/me");
}
