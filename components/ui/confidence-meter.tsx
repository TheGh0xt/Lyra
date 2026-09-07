import { cn } from "@/lib/ui/cn";
import { TONE_CLASSES } from "@/lib/ui/tone";
import {
  CONFIDENCE_CEILING,
  confidenceLabel,
  confidenceTone,
} from "@/lib/ui/contract-display";

export interface ConfidenceMeterProps {
  /** `MarketAnalysisReport.confidence_score`, 0–1 as the schema defines it. */
  score: number;
  /** One line on why the score is what it is. Optional; omitted on compact rows. */
  note?: string;
  className?: string;
}

/**
 * The confidence meter, with the 90% ceiling drawn on it.
 *
 * The tick at 90% is not decoration. Confidence is capped there permanently
 * because market causality can't be proven from public data, only argued from
 * it — so the bar shows a wall the fill can never reach, and says so in words
 * underneath. A meter that could run to 100% would imply a certainty the
 * product refuses to claim.
 *
 * Colour carries the level, and so does the word beside the number: at HIGH /
 * MODERATE / LOW the meter is legible in greyscale (UI_PRD §9).
 */
export function ConfidenceMeter({ score, note, className }: ConfidenceMeterProps) {
  const clamped = Math.min(Math.max(score, 0), 1);
  const percent = Math.round(clamped * 100);
  const tone = TONE_CLASSES[confidenceTone(clamped)];
  const level = confidenceLabel(clamped);

  return (
    <div className={cn("flex flex-col gap-[9px]", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-sans text-[13px] font-medium text-dim">Confidence</span>
        <span className="flex items-baseline gap-2">
          <span className={cn("font-sans text-[13px] font-semibold", tone.fg)}>{level}</span>
          <span className="font-mono text-xl font-medium">{percent}%</span>
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence ${percent} percent, ${level}. Capped at ${Math.round(
          CONFIDENCE_CEILING * 100,
        )} percent.`}
        className="relative h-[9px] overflow-hidden rounded-full bg-elev"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-linear", tone.bar)}
          style={{ width: `${percent}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-[3px] h-[15px] w-0.5 bg-line-2"
          style={{ left: `${CONFIDENCE_CEILING * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        {note ? <span className="font-sans text-xs text-dim">{note}</span> : <span />}
        <span className="font-mono text-[11.5px] text-faint">
          cap {Math.round(CONFIDENCE_CEILING * 100)}%
        </span>
      </div>
    </div>
  );
}
