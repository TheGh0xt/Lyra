import {
  STAGES,
  STAGE_DETAIL,
  STAGE_LABELS,
  type Stage,
  type StageStatus,
} from "@/lib/api/stages";

const DOT: Record<StageStatus, string> = {
  pending: "border-neutral-300 dark:border-neutral-700",
  active:
    "border-sky-500 bg-sky-500/20 animate-pulse dark:border-sky-400 dark:bg-sky-400/20",
  done: "border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400",
};

const TEXT: Record<StageStatus, string> = {
  pending: "text-neutral-400 dark:text-neutral-600",
  active: "text-neutral-900 dark:text-neutral-100",
  done: "text-neutral-600 dark:text-neutral-400",
};

export function StageList({
  statuses,
}: {
  statuses: Record<Stage, StageStatus>;
}) {
  return (
    <ol className="space-y-4" aria-label="Analysis progress">
      {STAGES.map((stage) => {
        const status = statuses[stage];
        return (
          <li key={stage} className="flex gap-3">
            <span
              className={`mt-1 size-3 shrink-0 rounded-full border-2 ${DOT[status]}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${TEXT[status]}`}>
                {STAGE_LABELS[stage]}
                {/* Screen readers get the state as text, not just colour. */}
                <span className="sr-only"> — {status}</span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                {STAGE_DETAIL[stage]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
