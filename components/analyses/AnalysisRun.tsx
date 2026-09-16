"use client";

import { useEffect, useRef, useState } from "react";
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
  const [retrying, setRetrying] = useState(false);
  const seen = useRef<SeenEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let existing: AnalysisResult | null = null;
      try {
        const response = await fetch(`/api/analyses/${id}`);
        if (response.ok) existing = (await response.json()) as AnalysisResult;
      } catch {
        // Fall through to the live stream — a transient read failure here
        // shouldn't block watching the run that's still in progress.
      }
      if (cancelled) return;

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
          if (cancelled) return;
          if (frame.event === "report") {
            setReport(frame.data as MarketAnalysisReport);
            return;
          }
          if (frame.event === "error") {
            const detail = (frame.data as { detail?: string } | undefined)?.detail;
            setFailure(detail ?? "The analysis failed.");
            return;
          }
          seen.current = [...seen.current, { event: frame.event, stage: frame.stage }];
          setStatuses(stageStatuses(seen.current));
        });
      } catch {
        if (!cancelled) setFailure("The connection to the analysis stream was lost.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
          onRetry={retry}
          onBackToFeed={() => router.push("/feed")}
        />
      )}
    </div>
  );
}
