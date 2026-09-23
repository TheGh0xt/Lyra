import { relay } from "@/lib/api/authedFetch";
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

/**
 * An analysis takes 60-120 seconds and this function stays alive for the
 * whole stream. Next-on-Vercel defaults to 15s, so every run was cut
 * mid-stream — and because nothing in the repo set it, and there is no
 * `vercel.json`, the 15s ceiling was invisible to anyone reading the code
 * (LYR-03, XC-14).
 *
 * 60 rather than 120: 60s is the documented ceiling on Vercel's Hobby plan,
 * and a value above the plan's limit fails the *build*, which would take the
 * whole site down rather than one route. Lifting this further is a plan
 * decision for the account owner, not a code change — see the PR.
 *
 * A 60s cap still cuts a slow run, but that is now a visible, recoverable
 * "Lost connection / Check status" rather than a silent hang, because
 * `consumeStream` throws when a stream ends without a terminal frame.
 */
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getAccessToken(request);
  if (!token) {
    return problem("unauthorized", "Sign in to continue.", 401);
  }

  const { id } = await params;

  // The only proxy in the app without this guard. An unreachable Cygnus
  // threw a TypeError straight out of the handler, so Next served its HTML
  // 500 page — which the client cannot read as problem+json, compounding
  // into the LYR-02 hang.
  let upstream: Response;
  try {
    upstream = await fetch(
      `${cygnusUrl()}/v1/analyses/${encodeURIComponent(id)}/events`,
      { headers: { accept: "text/event-stream", authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    // Logged, per F6: a proxy that fails silently leaves nothing behind to
    // explain a user-visible hang.
    console.error("events proxy: upstream fetch failed", error);
    return problem(
      "sagittarius-unavailable",
      "Could not reach the analysis service.",
      502,
    );
  }

  if (!upstream.ok || !upstream.body) {
    // Via `relay` rather than a local `new Response(await upstream.text(),
    // …)`: that line throws on a 204, because the empty string `text()`
    // returns still counts as a body. Lyra#28 fixed exactly that — but only
    // inside `authedFetch`, and this route had its own copy of the line.
    return relay(upstream);
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
