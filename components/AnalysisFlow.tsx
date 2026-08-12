"use client";

import { useCallback, useRef, useState } from "react";

import {
  describeProblem,
  isProblem,
  type MarketAnalysisReport,
  type Problem,
} from "@/lib/api/client";
import { consumeStream } from "@/lib/api/sse";
import {
  stageStatuses,
  type SseEventName,
  type Stage,
  type StageStatus,
} from "@/lib/api/stages";
import { ReportView } from "@/components/ReportView";
import { StageList } from "@/components/StageList";

type SeenEvent = { event: SseEventName; stage: string | null };

const PENDING: Record<Stage, StageStatus> = stageStatuses([]);

export function AnalysisFlow() {
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] =
    useState<Record<Stage, StageStatus>>(PENDING);
  const [report, setReport] = useState<MarketAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<SeenEvent[]>([]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (running || query.trim().length < 3) return;

      setRunning(true);
      setReport(null);
      setError(null);
      setStatuses(PENDING);
      seen.current = [];

      let analysisId: string;
      try {
        const created = await fetch("/api/analyses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const payload: unknown = await created.json();
        if (!created.ok) {
          setError(
            describeProblem(isProblem(payload) ? (payload as Problem) : null),
          );
          setRunning(false);
          return;
        }
        analysisId = (payload as { analysis_id: string }).analysis_id;
      } catch {
        setError("Could not reach the analysis service.");
        setRunning(false);
        return;
      }

      try {
        await consumeStream(`/api/analyses/${analysisId}/events`, (frame) => {
          if (frame.event === "report") {
            setReport(frame.data as MarketAnalysisReport);
            return;
          }
          if (frame.event === "error") {
            const detail = (frame.data as { detail?: string })?.detail;
            setError(detail ?? "The analysis failed.");
            return;
          }
          seen.current = [
            ...seen.current,
            { event: frame.event, stage: frame.stage },
          ];
          setStatuses(stageStatuses(seen.current));
        });
      } catch {
        setError("The connection to the analysis stream was lost.");
      } finally {
        setRunning(false);
      }
    },
    [query, running],
  );

  const started = running || report !== null || error !== null;

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-3">
        <label
          htmlFor="query"
          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          Polymarket event URL or slug
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="world-cup-winner"
            disabled={running}
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={running || query.trim().length < 3}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {running ? "Analysing…" : "Analyse market"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Paste a full Polymarket event URL or just its slug.
        </p>
      </form>

      {started && (
        <div className="grid gap-8 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div aria-live="polite">
            <StageList statuses={statuses} />
          </div>

          <div className="min-w-0">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
              >
                <p className="font-medium">This analysis didn&apos;t finish</p>
                <p className="mt-1">{error}</p>
              </div>
            )}
            {report && <ReportView report={report} />}
            {!report && !error && (
              <p className="text-sm text-neutral-500">
                Gathering evidence. A full run takes up to a couple of minutes
                across four stages.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
