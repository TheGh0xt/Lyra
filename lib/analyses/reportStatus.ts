import type { AnalysisResult, MarketAnalysisReport } from "@/lib/api/client";
import type { STATE_DISPLAY } from "@/lib/ui/state-display";

export type ViewState =
  | { kind: "running" }
  | { kind: "report"; report: MarketAnalysisReport }
  | { kind: "failed"; detail: string };

/**
 * What to show for an `AnalysisResult`, from the two fields that actually
 * carry a verdict — `status` is a free-form string Cygnus is free to reword,
 * so this never branches on it.
 */
export function deriveViewState(result: AnalysisResult): ViewState {
  if (result.report) return { kind: "report", report: result.report };
  if (result.error) return { kind: "failed", detail: result.error };
  return { kind: "running" };
}

/**
 * UI_PRD §6.10's "analysis completed but found nothing notable" — a
 * legitimate, honest outcome, not a failure.
 *
 * There's no dedicated field for this, so it's inferred: the analyst
 * concluded it couldn't explain the move (`UNKNOWN_ANOMALY`) *and* cited no
 * supporting evidence at all. An unknown-anomaly report that still lists
 * drivers is a different, more interesting case — "real move, no clean
 * cause" — and gets the normal report layout.
 */
export function isHonestNonResult(report: MarketAnalysisReport): boolean {
  return report.primary_causal_driver === "UNKNOWN_ANOMALY" && report.key_drivers.length === 0;
}

type FailureTag = keyof Pick<typeof STATE_DISPLAY, "serviceUnreachable" | "notFound" | "modelError">;

/**
 * Best-effort classification of a whole-run failure's free-text detail into
 * one of UI_PRD §6.10's named states.
 *
 * The SSE stream's terminal `error` event carries only a string (see the
 * engineering note in UI_PRD §6.6: per-stage/per-tool detail isn't exposed
 * by the API yet), so this is pattern-matching on Cygnus's own wording, not
 * a structured code. It only has to distinguish the three states that can
 * actually happen mid-run; rate-limited and quota-exceeded are start-time
 * 403/429s, handled by `startAnalysis` before a run exists at all.
 */
export function classifyRunFailure(detail: string): FailureTag {
  const lower = detail.toLowerCase();
  if (lower.includes("sagittarius") || lower.includes("market data")) {
    return "serviceUnreachable";
  }
  if (lower.includes("no polymarket event") || lower.includes("not found")) {
    return "notFound";
  }
  return "modelError";
}
