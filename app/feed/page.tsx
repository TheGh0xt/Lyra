"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Owl, StatePanel } from "@/components/ui";
import { MarketCard } from "@/components/feed/MarketCard";
import { STATE_DISPLAY } from "@/lib/ui/state-display";
import { startAnalysis } from "@/lib/feed/startAnalysis";
import { loadRecentAnalyses, pushRecentAnalysis, type RecentAnalysis } from "@/lib/feed/recentAnalyses";
import {
  describeProblem,
  isProblem,
  type MeResponse,
  type MovingMarket,
  type MovingMarketsResponse,
} from "@/lib/api/client";

type FeedState = "loading" | "loaded" | "error";

/**
 * The personalised home feed (UI_PRD §6.4).
 *
 * "Recent analyses" is client-side only — there is no `GET /v1/analyses`
 * list endpoint in the frozen contract, only create-one and read-one-by-id
 * — see `lib/feed/recentAnalyses.ts`. The prompt-starter library (§6.5) is
 * deliberately not built here: ROADMAP.md defers it out of this push.
 */
export default function FeedPage() {
  const router = useRouter();
  const [feedState, setFeedState] = useState<FeedState>("loading");
  const [feedError, setFeedError] = useState<string | null>(null);
  const [markets, setMarkets] = useState<MovingMarket[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [recents, setRecents] = useState<RecentAnalysis[]>([]);
  const [urlValue, setUrlValue] = useState("");
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "wall" | "error"; detail: string } | null>(null);

  useEffect(() => {
    // `localStorage` doesn't exist during SSR, so this can't be a lazy
    // `useState` initializer (that would mismatch the server-rendered
    // empty list on hydration) — an effect, client-only by definition, is
    // the correct place for it despite the lint rule's usual advice.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(loadRecentAnalyses());

    fetch("/api/me")
      .then((response) => (response.ok ? (response.json() as Promise<MeResponse>) : null))
      .then(setMe)
      .catch(() => setMe(null));

    fetch("/api/markets/moving")
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          setFeedError(describeProblem(isProblem(payload) ? payload : null));
          setFeedState("error");
          return;
        }
        setMarkets((payload as MovingMarketsResponse).markets);
        setFeedState("loaded");
      })
      .catch(() => {
        setFeedError("Couldn't reach the server. Check your connection and try again.");
        setFeedState("error");
      });
  }, []);

  async function runQuery(query: string, question: string, slug?: string) {
    setStarting(true);
    setNotice(null);
    const result = await startAnalysis(query, slug);
    setStarting(false);
    if (result.ok) {
      pushRecentAnalysis({ id: result.analysisId, question, when: new Date().toISOString() });
      router.push(`/analyses/${result.analysisId}`);
      return;
    }
    setNotice({ kind: result.kind, detail: result.detail });
  }

  async function submitUrl(event: React.FormEvent) {
    event.preventDefault();
    const value = urlValue.trim();
    if (value.length < 3) return;
    await runQuery(value, value);
  }

  const usage = me?.usage;
  const showsUsage = usage && usage.enforced;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-text">
            Moving today
          </h1>
          <p className="mt-1.5 font-sans text-sm text-dim">
            Ranked by how much the price moved, not by how many people are watching.
          </p>
        </div>
        {showsUsage ? (
          <div className="font-mono text-xs text-faint">
            {usage.analyses_this_month} / {usage.free_monthly_allowance} analyses this month
          </div>
        ) : null}
      </div>

      <form onSubmit={submitUrl} className="mb-7 rounded-2xl border border-line bg-elev p-4">
        <label htmlFor="feed-url" className="mb-2 block font-sans text-sm font-semibold text-text">
          Analyse any market by URL
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            id="feed-url"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
            placeholder="https://polymarket.com/event/…"
            disabled={starting}
            className="flex-1"
          />
          <Button type="submit" disabled={starting || urlValue.trim().length < 3}>
            {starting ? "Starting…" : "Explain this move"}
          </Button>
        </div>
      </form>

      {notice ? (
        <div role={notice.kind === "wall" ? "status" : "alert"} className="mb-7">
          <StatePanel
            tag={notice.kind === "wall" ? STATE_DISPLAY.limitReached : STATE_DISPLAY.rateLimited}
            title={notice.kind === "wall" ? "You've hit a limit" : "Couldn't start that analysis"}
            body={notice.detail}
          />
        </div>
      ) : null}

      {feedState === "loading" ? (
        <p className="font-sans text-sm text-dim">Loading your feed…</p>
      ) : feedState === "error" ? (
        <StatePanel
          tag={STATE_DISPLAY.serviceUnreachable}
          title="Market data service unreachable"
          body={feedError ?? "The market data service didn't respond. Try again shortly."}
          className="mb-8"
        />
      ) : markets.length === 0 ? (
        <StatePanel
          tag={STATE_DISPLAY.newHere}
          title="Your feed starts tomorrow"
          body="Nothing in your chosen categories moved enough to show yet. That's genuinely quiet, not a loading bug — check back after the next update, or analyse a market you already have in mind above."
          className="mb-8"
        />
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {markets.map((market) => (
            <MarketCard
              key={market.slug}
              market={market}
              disabled={starting}
              onExplain={(m) => void runQuery(m.question, m.question, m.slug)}
            />
          ))}
        </div>
      )}

      <h2 className="mb-3 font-display text-xl font-bold tracking-[-0.02em] text-text">
        Recent analyses
      </h2>
      {recents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-2 p-6 text-center">
          <Owl size={36} />
          <p className="m-0 font-sans text-sm text-dim">
            Nothing yet. Analyses you run in this browser show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recents.map((recent) => (
            <button
              key={recent.id}
              type="button"
              onClick={() => router.push(`/analyses/${recent.id}`)}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-line-2"
            >
              <span className="flex-1 truncate font-sans text-sm text-text">{recent.question}</span>
              <time
                dateTime={recent.when}
                className="shrink-0 font-mono text-[11px] text-faint"
              >
                {new Date(recent.when).toLocaleDateString()}
              </time>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
