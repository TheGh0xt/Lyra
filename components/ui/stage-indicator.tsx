import { cn } from "@/lib/ui/cn";
import { TONE_CLASSES } from "@/lib/ui/tone";
import { STAGE_STATUS } from "@/lib/ui/contract-display";

/**
 * Four states, matching what the SSE stream can actually tell us.
 *
 * `stageStatuses` in `lib/api/stages.ts` folds events into pending/active/done;
 * `failed` comes from the terminal `error` frame, which is per-run rather than
 * per-stage, so the caller decides which stage it lands on.
 */
export type StageState = "pending" | "active" | "done" | "failed";

export interface StageIndicatorProps {
  label: string;
  state: StageState;
  detail?: string;
  className?: string;
}

/**
 * One chip in the live investigation view (§6.6).
 *
 * The status is carried three ways — the dot's colour, its shape/size, and the
 * status word rendered for screen readers — because this is the screen a user
 * stares at for two minutes and the one where "which stage is running" must
 * never be ambiguous.
 *
 * `aria-live="polite"` on the container means each transition is announced,
 * which UI_PRD §9 requires by name. The pulse is CSS-only, so the global
 * reduced-motion rule in globals.css disables it without a JS branch.
 */
export function StageIndicator({ label, state, detail, className }: StageIndicatorProps) {
  const display = STAGE_STATUS[state];
  const tone = TONE_CLASSES[display.tone];

  return (
    <div
      className={cn(
        "flex items-center gap-[9px] rounded-[11px] border px-[14px] py-[11px]",
        state === "active" ? "bg-elev border-line-2" : "bg-transparent",
        state === "failed" ? "border-ro" : state === "active" ? "border-line-2" : "border-line",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center rounded-full text-[10px] font-bold text-white",
          state === "done" || state === "failed"
            ? "size-[18px]"
            : state === "active"
              ? "size-3 animate-pulse"
              : "size-[9px]",
          state === "pending" ? "bg-sl-soft" : tone.bar,
        )}
      >
        {state === "done" ? "✓" : state === "failed" ? "!" : ""}
      </span>
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            "font-sans text-[13px] font-medium",
            state === "pending" ? "text-faint" : "text-text",
          )}
        >
          {label}
          <span className="sr-only">{` — ${display.label}`}</span>
        </span>
        {detail ? (
          <span className="font-mono text-[11px] text-faint">{detail}</span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The full four-stage strip. Announces its own updates, so the individual
 * chips do not each need a live region.
 */
export function StageList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {children}
    </div>
  );
}
