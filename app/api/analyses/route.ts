import { cygnusUrl } from "@/lib/api/client";
import { problem } from "@/lib/api/problem";

/**
 * Starts an analysis.
 *
 * A thin proxy rather than a direct browser call to Cygnus: it keeps the API
 * address server-side and gives auth a single place to live in Phase 3.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  try {
    const upstream = await fetch(`${cygnusUrl()}/v1/analyses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    // Cygnus itself is unreachable — distinct from Cygnus reporting that
    // Sagittarius is down, which arrives as a normal problem+json response.
    console.error("POST /api/analyses: upstream fetch failed", error);
    return problem(
      "sagittarius-unavailable",
      "The analysis service is unreachable.",
      502,
    );
  }
}
