/**
 * The five semantic tones colour is allowed to carry.
 *
 * UI_PRD §5 restricts colour to places where it does real work — confidence,
 * impact severity, stage status — so the palette is exposed as a closed set of
 * tones rather than as raw colours. A component takes a tone; it never takes a
 * hex value or a token name.
 */
export const TONES = ["accent", "positive", "caution", "negative", "neutral"] as const;
export type Tone = (typeof TONES)[number];

/** Foreground / soft-background / border classes per tone. */
export const TONE_CLASSES: Record<Tone, { fg: string; soft: string; border: string; bar: string }> = {
  accent: {
    fg: "text-violet-text",
    soft: "bg-violet-soft",
    border: "border-violet",
    bar: "bg-violet",
  },
  positive: { fg: "text-em", soft: "bg-em-soft", border: "border-em", bar: "bg-em" },
  caution: { fg: "text-am", soft: "bg-am-soft", border: "border-am", bar: "bg-am" },
  negative: { fg: "text-ro", soft: "bg-ro-soft", border: "border-ro", bar: "bg-ro" },
  neutral: { fg: "text-sl", soft: "bg-sl-soft", border: "border-sl", bar: "bg-sl" },
};
