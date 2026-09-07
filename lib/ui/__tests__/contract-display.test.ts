import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CAUSAL_DRIVER,
  CLAIM_VERIFICATION,
  CONFIDENCE_CEILING,
  IMPACT,
  MARKET_SOURCE,
  SOURCE_TIER,
  confidenceLabel,
  confidenceTone,
  type Display,
} from "../contract-display";
import { TONE_CLASSES, TONES } from "../tone";

/**
 * Read the enums out of the frozen contract rather than restating them.
 *
 * A hand-copied list would pass forever after Cygnus adds a driver — the badge
 * would render blank and nothing would say so. Reading openapi.json means the
 * contract-drift gate in CI and this test fail together.
 */
const openapi = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../openapi.json", import.meta.url)), "utf8"),
) as { components: { schemas: Record<string, { enum?: string[] }> } };

function contractEnum(name: string): string[] {
  const values = openapi.components.schemas[name]?.enum;
  if (!values) throw new Error(`openapi.json has no enum for ${name}`);
  return values;
}

const MAPS: [string, string, Record<string, Display>][] = [
  ["Impact", "IMPACT", IMPACT],
  ["SourceTier", "SOURCE_TIER", SOURCE_TIER],
  ["ClaimVerification", "CLAIM_VERIFICATION", CLAIM_VERIFICATION],
  ["CausalDriver", "CAUSAL_DRIVER", CAUSAL_DRIVER],
  ["MarketSource", "MARKET_SOURCE", MARKET_SOURCE],
];

describe("every contract enum value is presentable", () => {
  it.each(MAPS)("%s is fully covered by %s", (schema, _name, map) => {
    expect(Object.keys(map).sort()).toEqual(contractEnum(schema).sort());
  });
});

describe("never colour alone", () => {
  const everyDisplay = MAPS.flatMap(([, name, map]) =>
    Object.entries(map).map(([key, display]) => [`${name}.${key}`, display] as const),
  );

  it.each(everyDisplay)("%s carries a printed label and a glyph", (_key, display) => {
    // The rule from UI_PRD §9, made mechanical: a tone is only ever allowed
    // alongside words and a shape, so the meaning survives greyscale.
    expect(display.label.trim().length).toBeGreaterThan(0);
    expect(display.glyph.trim().length).toBeGreaterThan(0);
    expect(display.hint.trim().length).toBeGreaterThan(0);
    expect(TONES).toContain(display.tone);
    expect(TONE_CLASSES[display.tone]).toBeDefined();
  });
});

describe("confidence", () => {
  it("is capped below certainty", () => {
    // Not a style choice. A meter that can reach 100% claims proven causality.
    expect(CONFIDENCE_CEILING).toBeLessThan(1);
    expect(CONFIDENCE_CEILING).toBe(0.9);
  });

  it.each([
    [0.95, "positive", "High"],
    [0.7, "positive", "High"],
    [0.69, "caution", "Moderate"],
    [0.45, "caution", "Moderate"],
    [0.44, "negative", "Low"],
    [0, "negative", "Low"],
  ])("scores %s as %s / %s", (score, tone, label) => {
    expect(confidenceTone(score)).toBe(tone);
    expect(confidenceLabel(score)).toBe(label);
  });
});
