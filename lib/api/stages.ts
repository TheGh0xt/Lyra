/**
 * The four pipeline stages, and the SSE event vocabulary Cygnus emits.
 *
 * Stage names are the public contract from `pipeline.py`'s STAGE_BY_AUTHOR —
 * deliberately decoupled from ADK's internal agent names, so renaming an
 * agent upstream cannot break this UI.
 *
 * OpenAPI cannot describe an SSE frame sequence, so these types are written
 * by hand and pinned by tests. They are the one part of the contract that
 * codegen can't cover.
 */

export const STAGES = [
  "event_retrieval",
  "signal_retrieval",
  "news_retrieval",
  "analysis",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  event_retrieval: "Retrieving market data",
  signal_retrieval: "Detecting signals",
  news_retrieval: "Gathering news",
  analysis: "Reasoning",
};

export const STAGE_DETAIL: Record<Stage, string> = {
  event_retrieval: "Fetching the event and its markets from Polymarket",
  signal_retrieval: "Whale trades, order-book skew, volume anomalies",
  news_retrieval: "Searching for dated, citable news on the subject",
  analysis: "Synthesising a causal explanation from the evidence",
};

export type SseEventName =
  | "stage_started"
  | "stage_completed"
  | "report"
  | "error";

export type StageStatus = "pending" | "active" | "done";

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

/**
 * Fold the stage events seen so far into a status per stage.
 *
 * Kept as a pure function so the state machine is testable without a
 * network, a browser, or a running backend.
 */
export function stageStatuses(
  events: { event: SseEventName; stage: string | null }[],
): Record<Stage, StageStatus> {
  const statuses = Object.fromEntries(
    STAGES.map((stage) => [stage, "pending"]),
  ) as Record<Stage, StageStatus>;

  for (const item of events) {
    if (!isStage(item.stage)) continue;
    if (item.event === "stage_started" && statuses[item.stage] === "pending") {
      statuses[item.stage] = "active";
    }
    if (item.event === "stage_completed") {
      statuses[item.stage] = "done";
    }
  }
  return statuses;
}
