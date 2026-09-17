import type { Display } from "./contract-display";

/**
 * The eight named error/empty states from UI_PRD §6.10, shared across the
 * feed and the run/report pages so the same failure always says the same
 * thing wherever it surfaces.
 *
 * Not all eight are reachable from every screen — see each call site's own
 * comment for which of these it uses and why.
 */
export const STATE_DISPLAY = {
  serviceUnreachable: {
    label: "Service",
    glyph: "⚠",
    tone: "caution",
    hint: "A dependency Cygnus needs is unavailable right now.",
  },
  notFound: {
    label: "Not found",
    glyph: "?",
    tone: "neutral",
    hint: "No Polymarket event matched that URL or slug.",
  },
  modelError: {
    label: "Model",
    glyph: "⚠",
    tone: "negative",
    hint: "The reasoning model couldn't complete this run.",
  },
  rateLimited: {
    label: "Rate limit",
    glyph: "◔",
    tone: "neutral",
    hint: "Too many requests in a short window.",
  },
  honestResult: {
    label: "Honest result",
    glyph: "✓",
    tone: "positive",
    hint: "A legitimate outcome — nothing notable happened, and that's not a failure.",
  },
  noNews: {
    label: "No news",
    glyph: "?",
    tone: "neutral",
    hint: "No coverage was found in the window that matters.",
  },
  newHere: {
    label: "New here",
    glyph: "◔",
    tone: "accent",
    hint: "Nothing moved enough yet in your chosen categories.",
  },
  limitReached: {
    label: "Limit reached",
    glyph: "◔",
    tone: "caution",
    hint: "The free allowance, or the invite gate, per Cygnus's own message.",
  },
} satisfies Record<string, Display>;
