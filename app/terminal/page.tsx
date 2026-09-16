"use client";

import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/terminal/CommandPalette";
import { FeedScreen } from "@/components/terminal/FeedScreen";
import { RunScreen } from "@/components/terminal/RunScreen";
import { ReportScreen } from "@/components/terminal/ReportScreen";
import { TerminalFooter, TerminalHeader, type TerminalScreenName } from "@/components/terminal/TerminalChrome";
import { TERM } from "@/lib/ui/terminalPalette";
import { formatProbability } from "@/lib/ui/format";
import { consumeStream } from "@/lib/api/sse";
import { stageStatuses, type SseEventName, type Stage, type StageStatus } from "@/lib/api/stages";
import { startAnalysis } from "@/lib/feed/startAnalysis";
import { rememberQuery } from "@/lib/feed/pendingQuery";
import {
  describeProblem,
  isProblem,
  type MarketAnalysisReport,
  type MovingMarket,
  type MovingMarketsResponse,
} from "@/lib/api/client";

type SeenEvent = { event: SseEventName; stage: string | null };

/**
 * Terminal mode (B.18) — the same feed/run/report data as the conventional
 * UI, aesthetic re-skinned onto a CRT-terminal look per
 * `PMIE Terminal Mode.dc.html`.
 *
 * Kept from the mockup: the aesthetic, the ⌘K palette, keyboard-first
 * navigation ([1]/[2]/[3], ESC), the persistent disclaimer bar, and "tags
 * are printed as well as coloured" (every tag below is bracket-text, not a
 * bare dot of colour).
 *
 * Removed, per the brief and UI_PRD's own rule against outcome forecasting:
 * modelled probability, the EDGE column/stat, the fabricated per-market
 * Brier-score claim, and the mockup's Kalshi-only tickers (Kalshi isn't
 * live — B.5 is deferred; the feed shows real Polymarket markets from
 * `GET /v1/markets/moving`).
 *
 * Known gap versus the conventional `/analyses/[id]` view: no
 * disconnected-vs-failed distinction on a dropped SSE connection (see
 * `AnalysisRun.tsx` and the Lyra#16 review) — a stream drop here shows the
 * same failure panel a genuine error would, so "retry" can spend a fresh
 * analysis on what might just be a lost connection. Flagged as a follow-up
 * rather than silently shipped.
 */
export default function TerminalPage() {
  const [screen, setScreen] = useState<TerminalScreenName>("feed");
  const [markets, setMarkets] = useState<MovingMarket[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [statuses, setStatuses] = useState<Record<Stage, StageStatus>>(() => stageStatuses([]));
  const [report, setReport] = useState<MarketAnalysisReport | null>(null);
  const [runFailure, setRunFailure] = useState<string | null>(null);
  const [marketLast, setMarketLast] = useState<string | null>(null);
  const seen = useRef<SeenEvent[]>([]);
  const generation = useRef(0);

  useEffect(() => {
    fetch("/api/markets/moving")
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          setFeedError(describeProblem(isProblem(payload) ? payload : null));
          setFeedLoading(false);
          return;
        }
        setMarkets((payload as MovingMarketsResponse).markets);
        setFeedLoading(false);
      })
      .catch(() => {
        setFeedError("Couldn't reach the server. Check your connection and try again.");
        setFeedLoading(false);
      });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      if (event.key === "1") setScreen("feed");
      if (event.key === "2") setScreen("run");
      if (event.key === "3" && report) setScreen("report");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [report]);

  async function launch(query: string, slug: string | undefined, lastProbability: string | null) {
    setPaletteOpen(false);
    setScreen("run");
    setReport(null);
    setRunFailure(null);
    setMarketLast(lastProbability);
    seen.current = [];
    setStatuses(stageStatuses([]));

    generation.current += 1;
    const gen = generation.current;

    const result = await startAnalysis(query, slug);
    if (generation.current !== gen) return;
    if (!result.ok) {
      setRunFailure(result.detail);
      return;
    }
    rememberQuery(result.analysisId, query);

    try {
      await consumeStream(`/api/analyses/${result.analysisId}/events`, (frame) => {
        if (generation.current !== gen) return;
        if (frame.event === "report") {
          setReport(frame.data as MarketAnalysisReport);
          setScreen("report");
          return;
        }
        if (frame.event === "error") {
          const detail = (frame.data as { detail?: string } | undefined)?.detail;
          setRunFailure(detail ?? "The analysis failed.");
          return;
        }
        seen.current = [...seen.current, { event: frame.event, stage: frame.stage }];
        setStatuses(stageStatuses(seen.current));
      });
    } catch {
      if (generation.current === gen) {
        setRunFailure("The connection to the analysis stream was lost.");
      }
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: TERM.bg,
        color: TERM.text,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TerminalHeader
        screen={screen}
        reportReady={report !== null}
        onNavigate={setScreen}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {screen === "feed" ? (
        <FeedScreen
          markets={markets}
          loading={feedLoading}
          error={feedError}
          onSelect={(market) =>
            void launch(market.question, market.slug, formatProbability(market.probability))
          }
        />
      ) : screen === "run" ? (
        <RunScreen statuses={statuses} failure={runFailure} onBackToFeed={() => setScreen("feed")} />
      ) : report ? (
        <ReportScreen report={report} marketLast={marketLast} />
      ) : null}

      {paletteOpen ? (
        <CommandPalette
          markets={markets}
          onSelectMarket={(market) =>
            void launch(market.question, market.slug, formatProbability(market.probability))
          }
          onSubmitQuery={(query) => void launch(query, undefined, null)}
          onClose={() => setPaletteOpen(false)}
        />
      ) : null}

      <TerminalFooter />
    </div>
  );
}
