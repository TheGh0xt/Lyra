import { cygnusUrl } from "@/lib/api/client";
import { problem } from "@/lib/api/problem";

/**
 * The selectable onboarding categories (UI_PRD §6.3).
 *
 * Genuinely public on Cygnus — the onboarding screen reads it before anyone
 * has signed in — so this is a plain pass-through, not `authedFetch`.
 */
export async function GET() {
  try {
    const upstream = await fetch(`${cygnusUrl()}/v1/interests/categories`);
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("GET /api/interests/categories: upstream fetch failed", error);
    return problem("sagittarius-unavailable", "The category list is unreachable.", 502);
  }
}
