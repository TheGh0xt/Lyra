import { cygnusUrl } from "@/lib/api/client";

/**
 * Wake the backend while the visitor is still reading or signing in.
 *
 * Both Cygnus and Sagittarius are on Render's free plan and sleep after ~15
 * minutes idle, taking roughly 50 seconds each to wake. A cold pair is ~100
 * seconds, and the request that pays for it is whichever one the tester makes
 * first — normally the feed, immediately after sign-in, which is the worst
 * possible moment.
 *
 * This moves that cost to a moment where waiting is free: the landing page
 * and the sign-in screen, where a person spends thirty seconds or more before
 * they need the API at all.
 *
 * **One request wakes both.** `/v1/ready` is unauthenticated and cheap, and
 * when Cygnus is cold, serving it means booting Cygnus — whose startup
 * lifespan already calls `warm_sagittarius()`. So the pair warms in parallel
 * off a single ping, which is the whole trick on a budget that can't afford
 * a tier that stays up.
 *
 * It does *not* cover the case where Cygnus is awake but Sagittarius has
 * slept independently: then `/v1/ready` answers from memory without touching
 * Sagittarius. Closing that needs `/v1/ready` (or a new `/v1/warm`) to kick
 * `warm_sagittarius()` in the background — a Cygnus change, tracked
 * separately.
 */

/*
 * The answer is not the point — the *arrival* is. Render starts the container
 * the moment the request reaches it, so a ping we abandon has already done
 * its job. We cap the wait well under the function limit and return regardless,
 * rather than holding a serverless invocation open for a cold start we are
 * not going to read.
 */
const WARM_TIMEOUT_MS = 20_000;

export const maxDuration = 30;

export async function GET() {
  try {
    await fetch(`${cygnusUrl()}/v1/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
    });
  } catch {
    // Every outcome is the same outcome. A timeout means the container is
    // busy booting, which is success; an unreachable Cygnus means the first
    // real request would have failed anyway and will report it properly.
    // Nothing here is worth telling the visitor about — they did not ask for
    // this request and cannot act on it.
  }

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
