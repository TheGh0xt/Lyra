/**
 * How each value in the report contract is presented.
 *
 * This file is the single enforcement point for UI_PRD §9's hardest rule:
 * **never colour alone**. Every entry carries a printed `label` and a `glyph`
 * alongside its `tone`, and the badge component renders all three. A new enum
 * value cannot be added without deciding what it says in words — which is the
 * point. The terminal design (B.18) reached the same rule independently
 * ("tags are printed as well as coloured"), so both modes share this map.
 *
 * The enum spellings are the wire values from `Cygnus/src/schemas/report.py`
 * (schema v2). They are UPPER_SNAKE on the wire and stay that way here so a
 * mismatch is a type error rather than a silently unstyled badge.
 */

import type { Tone } from "./tone";

export interface Display {
  /** Printed text. Never omitted — this is what makes the colour redundant. */
  label: string;
  /** A shape, not a colour: legible in monochrome and to a screen reader as text. */
  glyph: string;
  tone: Tone;
  /** Longer-form explanation, for tooltips and the component gallery. */
  hint: string;
}

/** `KeyDriver.impact` — how much this driver moved the price. */
export const IMPACT: Record<"HIGH" | "MEDIUM" | "LOW", Display> = {
  HIGH: {
    label: "High impact",
    glyph: "▲",
    tone: "positive",
    hint: "This driver accounts for most of the observed move.",
  },
  MEDIUM: {
    label: "Medium impact",
    glyph: "◆",
    tone: "caution",
    hint: "Consistent with the move, but not sufficient to explain it alone.",
  },
  LOW: {
    label: "Low impact",
    glyph: "▽",
    tone: "negative",
    hint: "Present and relevant, but it amplified rather than initiated.",
  },
};

/** `CitedSource.tier` — how much weight a citation carries on its own. */
export const SOURCE_TIER: Record<"PRIMARY" | "PARTIAL" | "WEAK", Display> = {
  PRIMARY: {
    label: "Primary",
    glyph: "●●●",
    tone: "positive",
    hint: "The issuing body: a filing, a statement, an official release.",
  },
  PARTIAL: {
    label: "Partial",
    glyph: "●●○",
    tone: "caution",
    hint: "Secondhand but attributed, or an excerpt behind a paywall.",
  },
  WEAK: {
    label: "Weak",
    glyph: "●○○",
    tone: "neutral",
    hint: "Unattributed aggregation, commentary, or an unnamed source.",
  },
};

/**
 * `CitedSource.verification` — whether the citation bears on the stated cause.
 *
 * CONTRADICTS is styled as a first-class result rather than an error: showing
 * the evidence that cuts against the conclusion is what makes the confidence
 * score legible, per the schema's own note.
 */
export const CLAIM_VERIFICATION: Record<
  "SUPPORTS" | "CONTRADICTS" | "UNSUPPORTED",
  Display
> = {
  SUPPORTS: {
    label: "Supports",
    glyph: "✓",
    tone: "positive",
    hint: "This item backs the stated cause.",
  },
  CONTRADICTS: {
    label: "Contradicts",
    glyph: "✕",
    tone: "negative",
    hint: "This item cuts against the stated cause. Shown, not hidden.",
  },
  UNSUPPORTED: {
    label: "Unsupported",
    glyph: "○",
    tone: "neutral",
    hint: "Retrieved, but says nothing either way about this move.",
  },
};

/** `MarketAnalysisReport.primary_causal_driver`. */
export const CAUSAL_DRIVER: Record<
  | "WHALE_ACTIVITY"
  | "VOLUME_SPIKE"
  | "LIQUIDITY_CRUNCH"
  | "EXTERNAL_NEWS"
  | "UNKNOWN_ANOMALY",
  Display
> = {
  WHALE_ACTIVITY: {
    label: "Whale activity",
    glyph: "◈",
    tone: "accent",
    hint: "Large wallets moved the book before retail volume arrived.",
  },
  VOLUME_SPIKE: {
    label: "Volume spike",
    glyph: "▲",
    tone: "accent",
    hint: "Turnover ran far above this market's recent median.",
  },
  LIQUIDITY_CRUNCH: {
    label: "Liquidity crunch",
    glyph: "◫",
    tone: "accent",
    hint: "Thin depth amplified the price impact of ordinary size.",
  },
  EXTERNAL_NEWS: {
    label: "External news",
    glyph: "◎",
    tone: "accent",
    hint: "Dated, citable coverage landed inside the move window.",
  },
  UNKNOWN_ANOMALY: {
    label: "Unknown anomaly",
    glyph: "?",
    tone: "neutral",
    hint: "The move is real but no evidence explains it. Said plainly rather than guessed at.",
  },
};

/** `MarketSource` — which venue the market lives on. */
export const MARKET_SOURCE: Record<"POLYMARKET" | "KALSHI", Display> = {
  POLYMARKET: { label: "Polymarket", glyph: "◆", tone: "accent", hint: "Polymarket." },
  KALSHI: { label: "Kalshi", glyph: "◆", tone: "accent", hint: "Kalshi." },
};

/**
 * The 48-hour re-check verdict.
 *
 * Not in the report schema — the evaluation engine writes it beside the report
 * — but it is presented on the same surface, so it shares this vocabulary.
 */
export const RECHECK: Record<"CONFIRMED" | "REVERSED" | "PENDING", Display> = {
  CONFIRMED: {
    label: "Confirmed",
    glyph: "✓",
    tone: "positive",
    hint: "Two days on, the explanation held.",
  },
  REVERSED: {
    label: "Reversed",
    glyph: "✕",
    tone: "negative",
    hint: "We got this one wrong. The report stays up unedited.",
  },
  PENDING: {
    label: "Pending",
    glyph: "◔",
    tone: "neutral",
    hint: "The re-check runs automatically 48 hours after analysis.",
  },
};

/** Stage status in the live investigation view (§6.6). */
export const STAGE_STATUS: Record<"done" | "active" | "pending" | "failed", Display> = {
  done: { label: "Complete", glyph: "✓", tone: "positive", hint: "This stage finished." },
  active: { label: "Active", glyph: "◐", tone: "accent", hint: "Running now." },
  pending: { label: "Pending", glyph: "○", tone: "neutral", hint: "Not started yet." },
  failed: { label: "Failed", glyph: "!", tone: "negative", hint: "This stage errored." },
};

/**
 * The permanent ceiling on `confidence_score`.
 *
 * Market causality cannot be proven from public data, only argued from it, so
 * the meter carries a visible tick here and the product never claims more.
 * Shared by both UI modes and by the confidence meter's own copy.
 */
export const CONFIDENCE_CEILING = 0.9;

/** Bucket a 0–1 confidence score into the tone the meter fills with. */
export function confidenceTone(score: number): Tone {
  if (score >= 0.7) return "positive";
  if (score >= 0.45) return "caution";
  return "negative";
}

/** The words that sit under the meter, so the number is never alone either. */
export function confidenceLabel(score: number): string {
  if (score >= 0.7) return "High";
  if (score >= 0.45) return "Moderate";
  return "Low";
}
