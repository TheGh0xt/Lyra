import type { Tone } from "./tone";

/** `MovingMarket.probability`, 0-1, as a whole-number percent. */
export function formatProbability(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

/**
 * `MovingMarket.change_24h` — a probability delta, same 0-1 scale as
 * `probability` — as a signed point count with a direction glyph.
 *
 * The glyph carries direction on its own so the figure survives greyscale
 * (UI_PRD §9); the tone is for the caller to colour it with.
 */
export function formatDelta(delta: number): { text: string; tone: Tone } {
  const points = Math.round(delta * 100);
  if (points > 0) return { text: `▲ +${points}`, tone: "positive" };
  if (points < 0) return { text: `▽ ${points}`, tone: "negative" };
  return { text: "◆ 0", tone: "neutral" };
}

/** `MovingMarket.volume_24h`, in dollars, compacted for a card's tight width. */
export function formatVolume(dollars: number): string {
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(2)}K`;
  return `$${Math.round(dollars)}`;
}
