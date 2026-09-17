import type { MeResponse } from "@/lib/api/client";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";

export const ONBOARDING_ROUTE = "/onboarding";
/** Where a fully onboarded user lands (B.17). Was `/analyze` (interim) pre-B.17. */
export const HOME_ROUTE = "/feed";
export const TERMINAL_ROUTE = "/terminal";
/** Also the enrollment screen — it reads the same AAL to decide which one to show. */
export const MFA_CHALLENGE_ROUTE = "/mfa";

/**
 * Where a signed-in user goes next.
 *
 * `ui_mode` (B.19) only matters once onboarding is done — the picker itself
 * always lives at the conventional `/onboarding`, regardless of a
 * previously-chosen mode, since terminal mode has no onboarding screen of
 * its own. `null` (never chosen) defaults to conventional, matching the
 * schema's own framing of `null` as "never chosen" rather than a real third
 * mode.
 */
export function routeForMe(me: MeResponse | null): string {
  if (!me) return ONBOARDING_ROUTE;
  if (!me.onboarding_completed) return ONBOARDING_ROUTE;
  return me.ui_mode === "TERMINAL" ? TERMINAL_ROUTE : HOME_ROUTE;
}

/**
 * Whether the current session needs a TOTP step-up before anything else
 * will work (F12).
 *
 * `nextLevel` is `"aal2"` exactly when the signed-in user has a *verified*
 * TOTP factor — Supabase computes that itself, from the account, not from
 * whatever this session happens to carry. `currentLevel` is what this
 * session's JWT actually carries right now. They differ only when a
 * verified-elsewhere-or-earlier factor hasn't been stepped up to in *this*
 * session yet — which is also true for the tail end of first-time
 * enrollment, before its own step-up completes.
 */
export function needsMfaStepUp(
  currentLevel: string | null | undefined,
  nextLevel: string | null | undefined,
): boolean {
  return nextLevel === "aal2" && currentLevel !== "aal2";
}

/**
 * Fetches the caller's profile and decides where to send them.
 *
 * Checks the session's own MFA assurance level *before* ever calling
 * `/api/me`: an aal1 session with a verified factor gets a 401
 * `mfa-required` from every route except `/v1/me/mfa` itself (see
 * `access.py` on the Cygnus side), so calling `/api/me` first would just
 * be a guaranteed-failing round trip on the way to the same answer. This
 * is also the fix for F12 - the actual deadlock was that nothing ever sent
 * a stepped-up-but-not-really user anywhere but here, in a loop.
 *
 * Any other failure — no session yet, Cygnus unreachable, a slow cold
 * start — routes to onboarding rather than blocking on an error screen.
 * Onboarding itself tolerates being visited by someone who already
 * finished it (the category picker just pre-fills), so this fails toward
 * the safer side.
 */
export async function fetchNextRoute(): Promise<string> {
  const { data: aal } = await supabaseBrowserClient().auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && needsMfaStepUp(aal.currentLevel, aal.nextLevel)) {
    return MFA_CHALLENGE_ROUTE;
  }

  try {
    const response = await fetch("/api/me");
    if (!response.ok) return ONBOARDING_ROUTE;
    const me = (await response.json()) as MeResponse;
    return routeForMe(me);
  } catch {
    return ONBOARDING_ROUTE;
  }
}
