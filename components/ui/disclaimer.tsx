import { cn } from "@/lib/ui/cn";

const COPY =
  "Research only. This explains what has already happened in a market. It is not a " +
  "prediction, not a recommendation, and not financial advice. PMIE is wrong some of " +
  "the time — the 48-hour re-check is how you find out when.";

/**
 * The research-only disclaimer.
 *
 * Required on every report view (ROADMAP 2.6, UI_PRD §11). The terminal design
 * made it a persistent bar rather than a footer, which is the better call and
 * the reason `variant="bar"` exists: a disclaimer below the fold is a
 * disclaimer nobody read.
 *
 * The copy lives here, once. Two modes quoting the same paragraph from two
 * files is how they end up saying different things.
 */
export function Disclaimer({
  variant = "block",
  className,
}: {
  variant?: "block" | "bar";
  className?: string;
}) {
  if (variant === "bar") {
    return (
      <div
        role="note"
        className={cn(
          "flex items-center gap-2 border-t border-line bg-elev px-4 py-2",
          "font-mono text-[11px] text-faint",
          className,
        )}
      >
        <span aria-hidden="true">⚠</span>
        <span className="truncate" title={COPY}>
          Research only — not a prediction, not advice. PMIE is wrong some of the time.
        </span>
      </div>
    );
  }

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-[13px] border border-line-2 bg-elev px-[18px] py-4",
        className,
      )}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className="mt-px shrink-0 text-dim"
      >
        <path d="M12 3.5l8 3.6v5c0 5-3.4 7.7-8 8.9-4.6-1.2-8-3.9-8-8.9v-5z" />
        <path d="M12 9.4v4M12 16.2v.2" />
      </svg>
      <p className="m-0 font-sans text-[12.8px] leading-relaxed text-dim">{COPY}</p>
    </div>
  );
}
