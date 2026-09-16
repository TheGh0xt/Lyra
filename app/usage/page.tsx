"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Owl, StatePanel } from "@/components/ui";
import { STATE_DISPLAY } from "@/lib/ui/state-display";
import { deriveWallState } from "@/lib/usage/wallState";
import { nextResetLabel } from "@/lib/usage/resetLabel";
import { describeProblem, isProblem, type MeResponse } from "@/lib/api/client";

/**
 * Real business price (user decision, 2026-09-14/15) — matches Cygnus's own
 * `PRO_MONTHLY_PRICE_USD` constant, which only ever reaches the client
 * embedded in the 403 `detail` string, not as a structured field. If that
 * constant changes, this needs updating by hand; the contract has no
 * `GET /v1/pricing` to read it from.
 */
const PRO_MONTHLY_PRICE_USD = 19;
const PRO_PLAN_ID = "pro-monthly";

/**
 * Usage & limits (UI_PRD §6.8) — always reachable, not only when blocked.
 *
 * The wall state comes from `deriveWallState`, using `is_invited` and the
 * real usage numbers from `GET /v1/me` directly, not from sniffing an error
 * message — `POST /v1/analyses`'s 403 shares one `quota-exceeded` slug
 * between "not invited" and "over quota", and only the second one should
 * ever see a price. See the coordinator's review on Lyra#16 (F9).
 */
export default function UsagePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [intentState, setIntentState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    fetch("/api/me")
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          setLoadError(describeProblem(isProblem(payload) ? payload : null));
          return;
        }
        setMe(payload as MeResponse);
      })
      .catch(() => setLoadError("Couldn't reach the server. Check your connection and try again."));
  }, []);

  async function recordIntent() {
    setIntentState("sending");
    try {
      const response = await fetch("/api/billing/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ price_shown_usd: PRO_MONTHLY_PRICE_USD, plan: PRO_PLAN_ID }),
      });
      setIntentState(response.ok ? "sent" : "error");
    } catch {
      setIntentState("error");
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <StatePanel tag={STATE_DISPLAY.serviceUnreachable} title="Couldn't load usage" body={loadError} />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="font-sans text-sm text-dim">Loading…</p>
      </div>
    );
  }

  const wall = deriveWallState(me);
  const used = me.usage.analyses_this_month;
  const allowance = me.usage.free_monthly_allowance;
  const percent = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-text">
        Usage &amp; limits
      </h1>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-sans text-sm font-semibold text-text">Free tier · this month</span>
          <span className="font-mono text-sm text-text">
            {used} / {allowance} analyses
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-elev">
          <div
            className="h-full rounded-full bg-em transition-[width] duration-300 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2.5 font-sans text-xs text-faint">
          {me.usage.enforced
            ? `Resets ${nextResetLabel()}. Unused analyses don't roll over.`
            : "Your account is grandfathered — this limit isn't enforced on you."}
        </div>
      </div>

      {wall === "not-invited" ? (
        // "Check back" rather than "we'll email you" — B.8 (Resend) is
        // deferred, and Supabase's built-in sender only delivers to project
        // team members, so this can't promise an email yet. Flip to an
        // email promise once H3 lands.
        <StatePanel
          tag={STATE_DISPLAY.limitReached}
          title="You're on the waitlist"
          body="VegaIntel is invite-only during the private alpha. Check back here once your account is activated — nothing to pay or upgrade in the meantime."
        />
      ) : null}

      {wall === "approaching" ? (
        <StatePanel
          tag={STATE_DISPLAY.limitReached}
          title="One analysis left this month"
          body={`You've used ${used} of ${allowance}. Nothing stops working when you reach the limit — the feed, past reports and re-checks all stay available. You just can't start a new analysis until ${nextResetLabel()}.`}
        />
      ) : null}

      {wall === "limit-reached" ? (
        <div className="rounded-2xl border border-line bg-elev p-6">
          <div className="mb-4 flex items-start gap-3.5">
            <Owl size={36} />
            <div>
              <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-text">
                That was your {allowance === 1 ? "one" : `${allowance}${suffix(allowance)}`} analysis
              </h2>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-dim">
                Your free allowance is used up for this month. Everything you&apos;ve already
                analysed stays readable, and the 48-hour re-checks still run and still update
                your reports.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {intentState === "sent" ? (
              // Same "check back" constraint as the not-invited panel above
              // — no email promise until H3 lands.
              <span className="font-sans text-sm font-medium text-em">
                Noted — thanks. Check back here for updates on Pro.
              </span>
            ) : (
              <Button type="button" onClick={recordIntent} disabled={intentState === "sending"}>
                {intentState === "sending"
                  ? "Recording…"
                  : `Upgrade to Pro — $${PRO_MONTHLY_PRICE_USD}/mo`}
              </Button>
            )}
            <Link
              href="/feed"
              className="font-sans text-sm font-semibold text-violet-text hover:underline"
            >
              Wait until {nextResetLabel()}
            </Link>
          </div>
          {intentState === "error" ? (
            <p role="alert" className="mt-3 font-sans text-xs text-ro">
              Couldn&apos;t record that. Your usage and free-tier standing are unaffected either way.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function suffix(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "st";
  if (n % 10 === 2 && n % 100 !== 12) return "nd";
  if (n % 10 === 3 && n % 100 !== 13) return "rd";
  return "th";
}
