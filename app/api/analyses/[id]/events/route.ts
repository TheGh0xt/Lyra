import { cygnusUrl } from "@/lib/api/client";
import { problem } from "@/lib/api/problem";
import { getAccessToken } from "@/lib/supabase/route-client";

/**
 * Proxies the Cygnus SSE stream to the browser.
 *
 * Owner-only, with no share-token exception — Cygnus's own route is the
 * same (a link shares a finished report, not a live view of someone else's
 * run) — so this 401s locally on a missing session rather than letting an
 * anonymous request reach Cygnus at all.
 *
 * The upstream body is piped through untouched rather than buffered — the
 * whole point is that stage events arrive as they happen. Buffering here
 * would silently reduce a live progress view back to a spinner.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getAccessToken(request);
  if (!token) {
    return problem("unauthorized", "Sign in to continue.", 401);
  }

  const { id } = await params;

  const upstream = await fetch(
    `${cygnusUrl()}/v1/analyses/${encodeURIComponent(id)}/events`,
    { headers: { accept: "text/event-stream", authorization: `Bearer ${token}` } },
  );

  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/problem+json",
      },
    });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Tells nginx-style proxies not to buffer. Vercel's edge honours
      // no-transform; verified in the Phase 2 deploy check.
      "x-accel-buffering": "no",
    },
  });
}
