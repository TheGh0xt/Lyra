import type { MeResponse } from "@/lib/api/client";

export type WallState = "not-invited" | "limit-reached" | "approaching" | "ok";

/**
 * What to show on `/usage` (UI_PRD §6.8), decided from structured fields
 * rather than sniffing Cygnus's error text.
 *
 * This matters because `POST /v1/analyses`'s 403 shares one `quota-exceeded`
 * slug between two unrelated causes — over quota, and not yet invited (see
 * `dependencies.py`/`routes.py` in Cygnus) — with "Upgrade to Pro" making
 * sense for exactly one of them. `/usage` has `is_invited` and the real
 * usage numbers directly from `GET /v1/me`, so it can tell them apart for
 * certain instead of guessing from wording, and only offer the paid
 * upgrade — never priced copy — for the case it actually fits (the review
 * that asked for this: don't hard-code "$19" for every 403).
 */
export function deriveWallState(me: MeResponse): WallState {
  if (!me.is_invited) return "not-invited";
  if (!me.usage.enforced) return "ok";
  const remaining = me.usage.free_monthly_allowance - me.usage.analyses_this_month;
  if (remaining <= 0) return "limit-reached";
  if (remaining === 1) return "approaching";
  return "ok";
}
