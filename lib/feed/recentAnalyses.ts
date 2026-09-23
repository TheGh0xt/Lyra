/**
 * The account's analysis history — one list, read and written by both UI
 * modes (UX-01, UX-04).
 *
 * Still `localStorage`, still per-browser. There is no `GET /v1/analyses`
 * list endpoint in the contract (only create-one and read-one-by-id), so a
 * genuinely account-scoped history needs a contract amendment on the Cygnus
 * side — tracked separately. This is the storage both modes share until then.
 *
 * **What UX-04 actually was.** Not "two lists that disagree": there is one
 * list, and before this change `app/(authed)/feed/page.tsx` was its only
 * reader *and* its only writer. Terminal mode never called either function,
 * so an analysis started in the terminal was recorded nowhere at all — it
 * did not merely fail to appear in the other mode, it vanished from both.
 * A run costs 60-120s and one of five monthly credits.
 *
 * Which is why UX-01 and UX-04 are one change and not two: the moment the
 * terminal writes here, its runs show up on the conventional feed, and the
 * only thing left to build is a surface to read them back.
 */

export type RecentAnalysis = {
  id: string;
  question: string;
  /** ISO 8601, written by us — never a model-supplied string. See `formatWhen`. */
  when: string;
};

const STORAGE_KEY = "vegaintel:recent-analyses";

/**
 * How many runs the store keeps.
 *
 * Raised from 5. The free tier is five analyses a *month*, so a five-entry
 * cap silently discarded everything older than a few weeks — for a product
 * whose reports are re-scored at T+48h and are meant to stay readable
 * afterwards.
 *
 * Both surfaces render the whole list rather than a slice of it. A display
 * cap smaller than the storage cap would have handed conventional mode a
 * history it could not scroll to the end of, which is a new parity gap
 * (UX-03) invented while closing an old one.
 */
export const MAX_RECENT_ANALYSES = 20;

export function loadRecentAnalyses(): RecentAnalysis[] {
  try {
    // `window.localStorage`, not the bare global: Node's own built-in
    // `localStorage` shadows the identifier and needs a `--localstorage-file`
    // flag, which isn't jsdom's implementation and isn't what a browser has.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Entries are read back from storage a previous version of this code
    // wrote, so the shape is not guaranteed — a half-written or
    // hand-edited entry must not take the screen down with it.
    return parsed.filter(isRecentAnalysis);
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

function isRecentAnalysis(value: unknown): value is RecentAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.question === "string" &&
    typeof entry.when === "string"
  );
}

/**
 * `when` as `YYYY-MM-DD HH:MM`, or null if it will not parse.
 *
 * We write these ourselves, so a bad value should be impossible — but
 * LYR-04 was four crashes from exactly that assumption held one layer up,
 * and an unguarded `toISOString()` throws `RangeError` rather than
 * returning something odd. A history row with no timestamp is a far better
 * outcome than a history screen that will not render.
 */
export function formatWhen(when: string): string | null {
  const date = new Date(when);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace("T", " ").slice(0, 16);
}
