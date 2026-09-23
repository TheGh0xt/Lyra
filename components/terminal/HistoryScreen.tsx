import { TERM } from "@/lib/ui/terminalPalette";
import { formatWhen, type RecentAnalysis } from "@/lib/feed/recentAnalyses";

export interface HistoryScreenProps {
  entries: RecentAnalysis[];
  /** Re-opens a past run: reads it back by id, live-streams it if still going. */
  onOpen: (entry: RecentAnalysis) => void;
}

/**
 * `[4] HISTORY` — the terminal's way back to a run that already happened
 * (UX-01).
 *
 * Before this, terminal mode was exactly FEED / RUN / REPORT: once a run
 * finished, the only route back to it was the analysis URL, and nothing in
 * the UI ever showed that URL. A run costs 60-120 seconds and one of five
 * monthly analyses, so "you cannot reach it again" is not a thin beta
 * feature — it discards what the user spent.
 *
 * Reads the same store the conventional feed does, so this list and the
 * feed's "Recent analyses" are the same list (UX-04).
 *
 * **Failed runs appear here too, and that is correct.** The entry is
 * written when a run *starts*, so anything that later failed is still
 * listed — it just isn't labelled as failed yet. Saying so needs
 * `AnalysisResult.error_type`, which Lyra's contract copy does not have
 * (XC-03); that labelling is UX-02. Opening a failed entry already shows
 * its failure, because the run screen reads the real status back by id.
 */
export function HistoryScreen({ entries, onOpen }: HistoryScreenProps) {
  return (
    <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ borderBottom: `1px solid ${TERM.border}` }}
      >
        <span style={{ color: TERM.phosphor }}>┌─</span>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim }}>
          HISTORY · {entries.length} {entries.length === 1 ? "run" : "runs"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: 14, color: TERM.textDim, fontSize: 12.5, lineHeight: 1.7 }}>
          no runs yet — start one from [1] FEED or ⌘K
          <div style={{ marginTop: 6, color: TERM.textDim, fontSize: 11 }}>
            {/*
              Said plainly rather than discovered later: this list lives in
              this browser, because the API has no endpoint to list an
              account's analyses yet.
            */}
            history is kept in this browser, so it won&apos;t follow you to another device
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 12px" }}>
          {entries.map((entry) => {
            const when = formatWhen(entry.when);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpen(entry)}
                className="grid w-full grid-cols-1 gap-y-1 px-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-x-2.5 sm:py-2"
                style={{
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  borderBottom: `1px solid ${TERM.borderDim}`,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <span
                  className="min-w-0 break-words"
                  style={{ color: TERM.textBright, fontSize: 12.5 }}
                >
                  {entry.question}
                </span>
                {when ? (
                  <time
                    dateTime={entry.when}
                    style={{ color: TERM.textDim, fontSize: 11.5, whiteSpace: "nowrap" }}
                  >
                    {when} UTC
                  </time>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
