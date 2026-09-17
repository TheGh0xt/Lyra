import type { Tone } from "./tone";

/**
 * Terminal mode's own palette (B.18) — a deliberate departure from the
 * conventional design's tokens, not a dark-theme variant of them. The
 * Claude Design terminal mockup (`PMIE Terminal Mode.dc.html`) is its own
 * aesthetic (CRT phosphor, scanlines, JetBrains Mono throughout), so this
 * is its own constant set rather than forcing `--violet`/`--em`/etc. to
 * double as something they were never designed to be.
 */
export const TERM = {
  bg: "#05050A",
  bgHeader: "#07070D",
  bgPanel: "#06060C",
  border: "#1B2A21",
  borderDim: "#0E1712",
  text: "#C9D4CD",
  textBright: "#E8F1EB",
  textDim: "#8A9A90",
  phosphor: "#37F58A",
  amber: "#F5A524",
  red: "#FF7A93",
  slate: "#9AA5B1",
} as const;

/**
 * The same closed `Tone` set every other screen uses (UI_PRD §5), mapped to
 * terminal colours instead of Tailwind tokens — so `IMPACT`, `SOURCE_TIER`,
 * `CLAIM_VERIFICATION`, `CAUSAL_DRIVER` and `STAGE_STATUS` from
 * `contract-display.ts` all work here unchanged. "Tags are printed as well
 * as coloured" (the terminal design's own rule, matching §9) falls out for
 * free: every `Display` already carries a printed `label`.
 */
export const TERMINAL_TONE: Record<Tone, string> = {
  accent: TERM.phosphor,
  positive: TERM.phosphor,
  caution: TERM.amber,
  negative: TERM.red,
  neutral: TERM.slate,
};
