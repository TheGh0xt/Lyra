import { cn } from "@/lib/ui/cn";
import { TONE_CLASSES } from "@/lib/ui/tone";
import type { Display } from "@/lib/ui/contract-display";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  display: Display;
  /**
   * Suppress the printed label. Only legitimate where the same word is already
   * on screen within the same line — never as a way to make a badge smaller.
   */
  labelHidden?: boolean;
}

/**
 * A status badge, always icon-and-text.
 *
 * It takes a `Display` from `lib/ui/contract-display` rather than a colour and
 * a string, which is what makes "never colour alone" structural: there is no
 * prop you could pass to get a bare coloured dot. The glyph is
 * `aria-hidden` because the label already says the same thing — announcing
 * both would read as "up-pointing triangle high impact".
 */
export function Badge({ display, labelHidden, className, ...props }: BadgeProps) {
  const tone = TONE_CLASSES[display.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-[11px] py-1.5",
        "font-sans text-xs font-semibold whitespace-nowrap",
        tone.soft,
        tone.fg,
        tone.border,
        className,
      )}
      title={display.hint}
      {...props}
    >
      <span aria-hidden="true">{display.glyph}</span>
      <span className={labelHidden ? "sr-only" : undefined}>{display.label}</span>
    </span>
  );
}
