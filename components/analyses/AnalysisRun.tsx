"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressView } from "@/components/analyses/ProgressView";
import { ReportCard } from "@/components/analyses/ReportCard";
import { ShareControls } from "@/components/analyses/ShareControls";
import { consumeStream } from "@/lib/api/sse";
import { stageStatuses, type SseEventName, type Stage, type StageStatus } from "@/lib/api/stages";
import { deriveViewState } from "@/lib/analyses/reportStatus";
import { startAnalysis } from "@/lib/feed/startAnalysis";
import { recallQuery, rememberQuery } from "@/lib/feed/pendingQuery";
import type { AnalysisResult, MarketAnalysisReport } from "@/lib/api/client";

type SeenEvent = { event: SseEventName; stage: string | null };

/**
 * The run + report view (UI_PRD §6.6/§6.7) for one analysis — one component
 * for both, matching the mockup's own `isProgress`/`isReport` toggle: the
 * view switches in place once the report arrives rather than navigating to
 * a second page.
 *
 * `GET /api/analyses/[id]` is checked first, before subscribing to SSE, so
 * reopening a finished run (a reload, a link from "recent analyses") shows
 * the report immediately instead of waiting on a stream that already ended.
 */
export function AnalysisRun({ id }: { id: string }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<Stage, StageStatus>>(() => stageStatuses([]));
  const [report, setReport] = useState<MarketAnalysisReport | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [checking, setChecking] = useState(false);
  const seen = useRef<SeenEvent[]>([]);
  // Bumped on every (re)watch attempt so a stale one (e.g. a reconnect
  // superseded by a newer check) can't overwrite state from a fresher one.
  const generation = useRef(0);

  const watch = useCallback(async (gen: number) => {
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
        return;
      }
      if (state.kind === "failed") {
        setFailure(state.detail);
        return;
      }
    }

    try {
      await consumeStream(`/api/analyses/${id}/events`, (frame) => {
        if (generation.current !== gen) return;
        if (frame.event === "report") {
          setReport(frame.data as MarketAnalysisReport);
          return;
        }
        if (frame.event === "error") {
          // A genuine failure Cygnus reported — distinct from the catch
          // below, which only means the connection dropped.
          const detail = (frame.data as { detail?: string } | undefined)?.detail;
          setFailure(detail ?? "The analysis failed.");
          return;
        }
        seen.current = [...seen.current, { event: frame.event, stage: frame.stage }];
        setStatuses(stageStatuses(seen.current));
      });
    } catch {
      // The stream connection dropped — a sleeping laptop, a network
      // change. The run itself keeps going server-side regardless, so this
      // must never look like "start a new one" (see `checkStatus`).
      if (generation.current === gen) setDisconnected(true);
    }
  }, [id]);

  useEffect(() => {
    generation.current += 1;
    void watch(generation.current);
    // No cleanup needed beyond the generation guard above: bumping it on
    // unmount isn't necessary since a stale watch's setState calls on an
    // unmounted component are simply dropped by React.
  }, [id, watch]);

  async function checkStatus() {
    setChecking(true);
    setDisconnected(false);
    generation.current += 1;
    const gen = generation.current;
    await watch(gen);
    if (generation.current === gen) setChecking(false);
  }

  async function retry() {
    const original = recallQuery(id);
    if (!original) {
      router.push("/feed");
      return;
    }
    setRetrying(true);
    const result = await startAnalysis(original);
    setRetrying(false);
    if (!result.ok) {
      setFailure(result.detail);
      return;
    }
    rememberQuery(result.analysisId, original);
    router.replace(`/analyses/${result.analysisId}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {report ? (
        <div className="flex flex-col gap-4">
          <ReportCard report={report} />
          <ShareControls analysisId={id} />
        </div>
      ) : (
        <ProgressView
          statuses={statuses}
          failure={retrying ? null : failure}
          disconnected={disconnected}
          checking={checking}
          onRetry={retry}
          onCheckStatus={() => void checkStatus()}
          onBackToFeed={() => router.push("/feed")}
        />
      )}
    </div>
  );
}
