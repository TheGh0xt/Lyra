/**
 * "Recent analyses" on the feed (UI_PRD §6.4) — kept client-side.
 *
 * There is no `GET /v1/analyses` list endpoint in the frozen contract, only
 * create-one and read-one-by-id. Rather than build nothing, or invent a
 * backend list endpoint mid-lane, this remembers the last few runs in
 * `localStorage`: per-browser, not per-account, and gone on a new device —
 * a disclosed, deliberate divergence from the mockup, not an oversight.
 */

export type RecentAnalysis = { id: string; question: string; when: string };

const STORAGE_KEY = "vegaintel:recent-analyses";
export const MAX_RECENT_ANALYSES = 5;

export function loadRecentAnalyses(): RecentAnalysis[] {
  try {
    // `window.localStorage`, not the bare global: Node's own built-in
    // `localStorage` shadows the identifier and needs a `--localstorage-file`
    // flag, which isn't jsdom's implementation and isn't what a browser has.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentAnalysis[]) : [];
  } catch {
    // Corrupt storage, or unavailable (private browsing, disabled site
    // data) — this feature is a convenience, never worth a crash.
    return [];
  }
}

export function pushRecentAnalysis(entry: RecentAnalysis): void {
  try {
    const deduped = loadRecentAnalyses().filter((r) => r.id !== entry.id);
    const next = [entry, ...deduped].slice(0, MAX_RECENT_ANALYSES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Same posture as the read side: losing this list is not an error.
  }
}
