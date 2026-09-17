"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/terminal/CommandPalette";
import { FeedScreen } from "@/components/terminal/FeedScreen";
import { RunScreen } from "@/components/terminal/RunScreen";
import { ReportScreen } from "@/components/terminal/ReportScreen";
import { TerminalFooter, TerminalHeader, type TerminalScreenName } from "@/components/terminal/TerminalChrome";
import { TERM } from "@/lib/ui/terminalPalette";
import { formatProbability } from "@/lib/ui/format";
import { consumeStream } from "@/lib/api/sse";
import { stageStatuses, type SseEventName, type Stage, type StageStatus } from "@/lib/api/stages";
import { deriveViewState } from "@/lib/analyses/reportStatus";
import { startAnalysis } from "@/lib/feed/startAnalysis";
import { rememberQuery } from "@/lib/feed/pendingQuery";
import { recordAnalysisStarted, recordUiModeSwitch } from "@/lib/telemetry/events";
import {
  describeProblem,
  isProblem,
  type AnalysisResult,
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
 * navigation ([1]/[2]/[3], ESC, [c]), the persistent disclaimer bar, and
 * "tags are printed as well as coloured" (every tag below is bracket-text,
 * not a bare dot of colour).
 *
 * Removed, per the brief and UI_PRD's own rule against outcome forecasting:
 * modelled probability, the EDGE column/stat, the fabricated per-market
 * Brier-score claim, and the mockup's Kalshi-only tickers (Kalshi isn't
 * live — B.5 is deferred; the feed shows real Polymarket markets from
 * `GET /v1/markets/moving`).
 *
 * Ports the Lyra#16 fix: a dropped SSE connection is `disconnected`, not
 * `failure` — the run keeps going server-side, so the recovery action is
 * "check status" (re-read, resubscribe if still running), never "retry"
 * (which would spend a fresh analysis on a run that may already be done).
 */
export default function TerminalPage() {
  const [screen, setScreen] = useState<TerminalScreenName>("feed");
  const [markets, setMarkets] = useState<MovingMarket[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<Stage, StageStatus>>(() => stageStatuses([]));
  const [report, setReport] = useState<MarketAnalysisReport | null>(null);
  const [runFailure, setRunFailure] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [marketLast, setMarketLast] = useState<string | null>(null);
  const seen = useRef<SeenEvent[]>([]);
  // Bumped on every (re)watch attempt so a stale one (e.g. a reconnect
  // superseded by a newer check) can't overwrite state from a fresher one.
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

  const watch = useCallback(async (gen: number, id: string) => {
    let existing: AnalysisResult | null = null;
    try {
      const response = await fetch(`/api/analyses/${id}`);
      if (response.ok) existing = (await response.json()) as AnalysisResult;
    } catch {
      // Fall through to the live stream — a transient read failure here
      // shouldn't block watching the run that's still in progress.
    }
    if (generation.current !== gen) return;

    if (existing) {
      const state = deriveViewState(existing);
      if (state.kind === "report") {
        setReport(state.report);
        setScreen("report");
        return;
      }
      if (state.kind === "failed") {
        setRunFailure(state.detail);
        return;
      }
    }

    try {
      await consumeStream(`/api/analyses/${id}/events`, (frame) => {
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
      if (generation.current === gen) setDisconnected(true);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!analysisId) return;
    setChecking(true);
    setDisconnected(false);
    generation.current += 1;
    const gen = generation.current;
    await watch(gen, analysisId);
    if (generation.current === gen) setChecking(false);
  }, [analysisId, watch]);

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
      if (event.key.toLowerCase() === "c" && disconnected && screen === "run") {
        void checkStatus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [report, disconnected, screen, checkStatus]);

  async function launch(query: string, slug: string | undefined, lastProbability: string | null) {
    setPaletteOpen(false);
    setScreen("run");
    setReport(null);
    setRunFailure(null);
    setDisconnected(false);
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
    setAnalysisId(result.analysisId);
    void recordAnalysisStarted("TERMINAL");

    await watch(gen, result.analysisId);
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
        onExitToConventional={() => void recordUiModeSwitch("CONVENTIONAL")}
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
        <RunScreen
          statuses={statuses}
          failure={runFailure}
          disconnected={disconnected}
          checking={checking}
          onBackToFeed={() => setScreen("feed")}
          onCheckStatus={() => void checkStatus()}
        />
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
