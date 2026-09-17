import type { MeResponse } from "@/lib/api/client";

export const ONBOARDING_ROUTE = "/onboarding";
/** Where a fully onboarded user lands (B.17). Was `/analyze` (interim) pre-B.17. */
export const HOME_ROUTE = "/feed";

/** Where a signed-in user goes next, based on onboarding status alone. */
export function routeForMe(me: MeResponse | null): string {
  if (!me) return ONBOARDING_ROUTE;
  return me.onboarding_completed ? HOME_ROUTE : ONBOARDING_ROUTE;
}

/**
 * Fetches the caller's profile and decides where to send them.
 *
 * Any failure — no session yet, Cygnus unreachable, a slow cold start —
 * routes to onboarding rather than blocking on an error screen. Onboarding
 * itself tolerates being visited by someone who already finished it (the
 * category picker just pre-fills), so this fails toward the safer side.
 */
export async function fetchNextRoute(): Promise<string> {
  try {
    const response = await fetch("/api/me");
    if (!response.ok) return ONBOARDING_ROUTE;
    const me = (await response.json()) as MeResponse;
    return routeForMe(me);
  } catch {
    return ONBOARDING_ROUTE;
  }
}
