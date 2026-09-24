import Link from "next/link";
import { STAGES, STAGE_LABELS, type Stage, type StageStatus } from "@/lib/api/stages";
import { TERMINAL_STAGE_LABEL, TERMINAL_STAGE_NOTE } from "@/lib/terminal/stageLabels";
import { TERM } from "@/lib/ui/terminalPalette";

export interface RunScreenProps {
  statuses: Record<Stage, StageStatus>;
  /** A genuine failure Cygnus reported — an `error` frame, or `AnalysisResult.error`. */
  failure: string | null;
  /**
   * The monthly allowance is used up, or the account isn't invited — Cygnus
   * raises both as one 403.
   *
   * Kept apart from `failure` because they are opposite messages: nothing
   * is broken, the user has simply spent what they had. `startAnalysis`
   * already returns this discriminant; terminal mode was discarding it and
   * rendering a red RUN FAILED panel, which reads as a broken product at
   * precisely the moment the user might have paid (UX-03 #11).
   */
  wall: string | null;
  /**
   * The stream connection dropped — distinct from `failure`. The run keeps
   * going server-side, so this never offers "back to feed and start over"
   * as the only way out; see `onCheckStatus`.
   */
  disconnected: boolean;
  /** True while `onCheckStatus`'s re-read is in flight. */
  checking?: boolean;
  onBackToFeed: () => void;
  /** Re-reads this same analysis's status. Only shown for `disconnected`. */
  onCheckStatus: () => void;
}

const BAR_WIDTH = 20;

function bar(status: StageStatus): string {
  const filled = status === "done" ? BAR_WIDTH : status === "active" ? BAR_WIDTH / 2 : 0;
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

/**
 * The live investigation view (UI_PRD §6.6), re-skinned for terminal mode.
 *
 * Four real stages, not the mockup's invented six — see
 * `lib/terminal/stageLabels.ts`. No per-stage sub-progress or tool counts:
 * the SSE stream only ever says a stage started or finished (the
 * engineering note in §6.6 — per-tool detail isn't exposed by the API), so
 * each bar is either empty, half (running), or full (done), not a
 * simulated fill.
 */
export function RunScreen({
  statuses,
  failure,
  wall,
  disconnected,
  checking,
  onBackToFeed,
  onCheckStatus,
}: RunScreenProps) {
  return (
    <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderBottom: `1px solid ${TERM.border}`,
        }}
      >
        <span style={{ color: TERM.phosphor }}>┌─</span>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim }}>
          STAGE PROGRESS
        </span>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {STAGES.map((stage) => {
          const status = statuses[stage];
          const mark = status === "done" ? "✓" : status === "active" ? "▸" : "·";
          const color = status === "pending" ? TERM.textDim : TERM.phosphor;
          return (
            <div
              key={stage}
              style={{
                display: "grid",
                gridTemplateColumns: "14px 1fr auto",
                gap: 8,
                alignItems: "baseline",
                padding: "6px 4px",
                borderBottom: `1px solid ${TERM.borderDim}`,
              }}
            >
              <span style={{ color, fontSize: 12 }}>{mark}</span>
              <div>
                <div
                  style={{
                    color: status === "pending" ? TERM.textDim : TERM.textBright,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                  }}
                >
                  {TERMINAL_STAGE_LABEL[stage]}
                  <span className="sr-only"> — {STAGE_LABELS[stage]}</span>
                </div>
                <div style={{ fontSize: 11, color: TERM.textDim }}>{TERMINAL_STAGE_NOTE[stage]}</div>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", marginTop: 3, color: "#1E7A48" }}>
                  {bar(status)}
                </div>
              </div>
              <span style={{ color, fontSize: 11.5, letterSpacing: "0.06em" }}>
                [{status === "done" ? "DONE" : status === "active" ? "RUN" : "WAIT"}]
              </span>
            </div>
          );
        })}
      </div>

      {wall ? (
        <div style={{ margin: "8px 12px", border: `1px solid ${TERM.amber}`, padding: "10px 12px" }}>
          <div style={{ color: TERM.amber, fontSize: 12, letterSpacing: "0.08em", marginBottom: 6 }}>
            ! LIMIT REACHED
          </div>
          {/*
            Cygnus writes this copy per request — the real price, the real
            reset date, or the invite-only wording — so it is rendered
            verbatim rather than replaced with a static string.
          */}
          <p style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.6, margin: "0 0 10px" }}>
            {wall}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/usage"
              className="inline-flex min-h-11 items-center sm:min-h-0"
              style={{
                fontSize: 12,
                color: TERM.text,
                border: `1px solid ${TERM.border}`,
                padding: "7px 10px",
              }}
            >
              VIEW USAGE &amp; PLANS
            </Link>
            <button
              type="button"
              onClick={onBackToFeed}
              className="min-h-11 sm:min-h-0"
              style={{
                font: "inherit",
                fontSize: 12,
                background: "transparent",
                color: TERM.textDim,
                border: `1px solid ${TERM.border}`,
                padding: "7px 10px",
                cursor: "pointer",
              }}
            >
              [1] BACK TO FEED
            </button>
          </div>
        </div>
      ) : null}

      {failure ? (
        <div style={{ margin: "8px 12px", border: `1px solid ${TERM.red}`, padding: "10px 12px" }}>
          <div style={{ color: TERM.red, fontSize: 12, letterSpacing: "0.08em", marginBottom: 6 }}>
            ! RUN FAILED
          </div>
          <p style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.6, margin: "0 0 10px" }}>
            {failure}
          </p>
          <button
            type="button"
            onClick={onBackToFeed}
            style={{
              font: "inherit",
              fontSize: 12,
              background: "transparent",
              color: TERM.text,
              border: `1px solid ${TERM.border}`,
              padding: "7px 10px",
              cursor: "pointer",
            }}
          >
            [1] BACK TO FEED
          </button>
        </div>
      ) : null}

      {disconnected ? (
        <div style={{ margin: "8px 12px", border: `1px solid ${TERM.slate}`, padding: "10px 12px" }}>
          <div style={{ color: TERM.slate, fontSize: 12, letterSpacing: "0.08em", marginBottom: 6 }}>
            ! CONNECTION LOST
          </div>
          <p style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.6, margin: "0 0 10px" }}>
            The run is probably still going on our side — checking again won&apos;t start a new
            one or cost you an analysis.
          </p>
          <button
            type="button"
            onClick={onCheckStatus}
            style={{
              font: "inherit",
              fontSize: 12,
              background: "transparent",
              color: TERM.text,
              border: `1px solid ${TERM.border}`,
              padding: "7px 10px",
              cursor: "pointer",
            }}
          >
            [c] {checking ? "CHECKING…" : "CHECK STATUS"}
          </button>
        </div>
      ) : null}

      <div
        style={{
          marginTop: "auto",
          padding: "9px 12px",
          borderTop: `1px solid ${TERM.border}`,
          fontSize: 11,
          color: TERM.textDim,
        }}
      >
        Leaving this screen doesn&apos;t cancel the run.
      </div>
    </section>
  );
}
