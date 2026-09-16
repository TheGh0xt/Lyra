/**
 * Remembers the query that started a run, keyed by its analysis id, so the
 * run page's "Retry" (UI_PRD §6.6) can start a fresh one with the same
 * input instead of only offering "back to feed".
 *
 * `sessionStorage`, not `localStorage`: this is scratch state for the
 * current tab's run, not something worth carrying to a new tab or day —
 * unlike `recentAnalyses.ts`, which is deliberately durable.
 */

const KEY_PREFIX = "vegaintel:query:";

export function rememberQuery(analysisId: string, query: string): void {
  try {
    window.sessionStorage.setItem(`${KEY_PREFIX}${analysisId}`, query);
  } catch {
    // Best-effort only — a failed retry that falls back to "back to feed"
    // is not worth crashing over.
  }
}

export function recallQuery(analysisId: string): string | null {
  try {
    return window.sessionStorage.getItem(`${KEY_PREFIX}${analysisId}`);
  } catch {
    return null;
  }
}
