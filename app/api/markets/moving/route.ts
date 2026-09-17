import { authedFetch } from "@/lib/api/authedFetch";

/** The signed-in user's personalised feed (UI_PRD §6.4). */
export async function GET(request: Request) {
  return authedFetch(request, "/v1/markets/moving");
}
