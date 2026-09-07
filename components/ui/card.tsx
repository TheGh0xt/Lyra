import { cn } from "@/lib/ui/cn";

/**
 * The surface panel every block on every screen sits in.
 *
 * Two levels only, matching the design: `surface` on the canvas, `elev` for a
 * block nested inside one. A third level would need a token the design does
 * not define.
 */
export function Card({
  className,
  level = "surface",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { level?: "surface" | "elev" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line p-5",
        level === "surface" ? "bg-surface" : "bg-elev",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "m-0 font-display text-[17px] font-semibold tracking-[-0.015em]",
        className,
      )}
      {...props}
    />
  );
}

/** An uppercase micro-label. Used for figure captions across the report. */
export function CardEyebrow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "font-sans text-[11px] font-medium uppercase tracking-[0.09em] text-faint",
        className,
      )}
      {...props}
    />
  );
}
