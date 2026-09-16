import { STAGES, STAGE_LABELS, type Stage, type StageStatus } from "@/lib/api/stages";
import { TERMINAL_STAGE_LABEL, TERMINAL_STAGE_NOTE } from "@/lib/terminal/stageLabels";
import { TERM } from "@/lib/ui/terminalPalette";

export interface RunScreenProps {
  statuses: Record<Stage, StageStatus>;
  failure: string | null;
  onBackToFeed: () => void;
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
export function RunScreen({ statuses, failure, onBackToFeed }: RunScreenProps) {
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
