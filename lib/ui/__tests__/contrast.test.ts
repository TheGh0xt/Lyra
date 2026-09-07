import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * WCAG AA contrast, measured from the token sheet itself.
 *
 * UI_PRD §9 calls AA in both themes non-negotiable, and a palette is exactly
 * the kind of thing that drifts one hex at a time. So this parses
 * `app/globals.css` rather than restating the values: editing a token and
 * breaking contrast fails here, in the same commit.
 *
 * It caught one real failure on the way in — the design's light-theme `--em`
 * (#0F8F4C) measured 4.16:1 on white — which is why that token is the one
 * deliberate deviation from the imported palette.
 */

const css = readFileSync(
  fileURLToPath(new URL("../../../app/globals.css", import.meta.url)),
  "utf8",
);

/** Pull every custom property out of one `:root`-style block. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`globals.css has no ${selector} block`);
  const block = css.slice(start, css.indexOf("}", start));
  const found: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    found[name] = value.trim();
  }
  return found;
}

/**
 * Just the flat colours, which are the only ones a contrast ratio is defined
 * for. The `-soft` tokens are translucent fills that composite against
 * whatever is behind them, so they are checked by the parity test, not here.
 */
function hexTokens(selector: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens(selector)).filter(([, v]) => /^#[0-9a-fA-F]{6}$/.test(v)),
  );
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Every surface a foreground token can be painted on. */
const BACKGROUNDS = ["canvas", "surface", "elev"] as const;

/**
 * `faint` is caption-sized supporting text — timestamps, provenance lines, the
 * character counter. AA's large-text threshold of 3.0 is the honest bar for it;
 * everything else carries meaning at body size and must clear 4.5.
 */
const FOREGROUNDS: [string, number][] = [
  ["text", 4.5],
  ["dim", 4.5],
  ["faint", 3.0],
  ["em", 4.5],
  ["am", 4.5],
  ["ro", 4.5],
  ["sl", 4.5],
  ["violet-text", 4.5],
];

describe.each([
  ["dark", ":root {"],
  ["light", '[data-theme="light"] {'],
])("%s theme meets WCAG AA", (_theme, selector) => {
  const palette = hexTokens(selector);

  it.each(
    FOREGROUNDS.flatMap(([fg, min]) =>
      BACKGROUNDS.map((bg) => [fg, bg, min] as const),
    ),
  )("%s on %s clears %s:1", (fg, bg, min) => {
    expect(palette[fg], `--${fg} missing`).toBeTruthy();
    expect(palette[bg], `--${bg} missing`).toBeTruthy();
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("both themes define the same tokens", () => {
  it("has no token present in one theme and absent from the other", () => {
    // A token defined only on :root silently keeps its dark value in light
    // mode — invisible in tests, obvious to a user.
    const dark = Object.keys(tokens(":root {")).sort();
    const light = Object.keys(tokens('[data-theme="light"] {')).sort();
    expect(light).toEqual(dark);
  });
});
