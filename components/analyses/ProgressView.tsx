import { Button, Owl, StageIndicator, StageList, StatePanel } from "@/components/ui";
import { STAGES, STAGE_DETAIL, STAGE_LABELS, type StageStatus } from "@/lib/api/stages";
import { classifyRunFailure } from "@/lib/analyses/reportStatus";
import { STATE_DISPLAY } from "@/lib/ui/state-display";

export interface ProgressViewProps {
  statuses: Record<(typeof STAGES)[number], StageStatus>;
  failure: string | null;
  onRetry: () => void;
  onBackToFeed: () => void;
}

/**
 * The live investigation view (UI_PRD §6.6) — the screen worth the most
 * craft per §4, since a run genuinely takes 60-120 seconds.
 *
 * No per-stage failure marker: the engineering note in §6.6 says per-tool
 * detail isn't exposed by the API, and a terminal `error` event is per-run,
 * not per-stage — marking a specific stage red would fabricate precision
 * the SSE stream doesn't have. A whole-run failure gets its own panel below
 * the stages instead, frozen at whatever pending/active/done state they
 * were last in.
 */
export function ProgressView({ statuses, failure, onRetry, onBackToFeed }: ProgressViewProps) {
  const tag = failure ? STATE_DISPLAY[classifyRunFailure(failure)] : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Owl size={32} />
        <div>
          <div className="font-sans text-[11px] font-medium uppercase tracking-[0.09em] text-faint">
            {failure ? "Run failed" : "Working on it"}
          </div>
          <p className="mt-0.5 font-sans text-sm text-dim">
            Typically 40-120 seconds. Leaving this page doesn&apos;t cancel it.
          </p>
        </div>
      </div>

      <StageList className="flex-col">
        {STAGES.map((stage) => (
          <StageIndicator
            key={stage}
            label={STAGE_LABELS[stage]}
            state={statuses[stage]}
            detail={statuses[stage] !== "pending" ? STAGE_DETAIL[stage] : undefined}
          />
        ))}
      </StageList>

      {failure && tag ? (
        <StatePanel
          tag={tag}
          title="This run didn't finish"
          body={failure}
          action={{ label: "Back to feed", onClick: onBackToFeed }}
        />
      ) : null}

      {failure ? (
        <Button type="button" onClick={onRetry} className="self-start">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
