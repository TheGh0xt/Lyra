"use client";

import { useState } from "react";
import { TERM } from "@/lib/ui/terminalPalette";
import { formatDelta, formatProbability } from "@/lib/ui/format";
import type { MovingMarket } from "@/lib/api/client";

export interface CommandPaletteProps {
  markets: MovingMarket[];
  onSelectMarket: (market: MovingMarket) => void;
  onSubmitQuery: (query: string) => void;
  onClose: () => void;
}

/**
 * ⌘K command palette (UI_PRD §6.6 clarification — the terminal mode's
 * keyboard-first affordance, kept per the brief).
 *
 * Filters the markets already loaded on the feed rather than hitting a
 * search endpoint — there is no market-search API in the contract, only
 * the personalised feed and analysis-by-query.
 */
export function CommandPalette({
  markets,
  onSelectMarket,
  onSubmitQuery,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? markets.filter((m) => m.question.toLowerCase().includes(query.trim().toLowerCase()))
    : markets;
  const results = filtered.slice(0, 6);

  function submit() {
    const trimmed = query.trim();
    if (results.length > 0) {
      onSelectMarket(results[0]);
      return;
    }
    if (trimmed.length >= 3) onSubmitQuery(trimmed);
  }

  return (
    <div
      className="flex items-start justify-center pt-[6vh] sm:pt-[12vh]"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(3,3,6,0.78)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(680px,92vw)",
          border: `1px solid ${TERM.phosphor}`,
          background: TERM.bgHeader,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 14px",
            borderBottom: `1px solid ${TERM.border}`,
          }}
        >
          <span style={{ color: TERM.phosphor }}>&gt;</span>
          <input
            aria-label="Market lookup or command"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
              if (event.key === "Escape") onClose();
            }}
            autoFocus
            placeholder="market, ticker, or a Polymarket URL"
            /*
             * UX-05. 16px below `sm` is not a taste call: iOS Safari zooms
             * the page whenever a focused input's text is under 16px, and it
             * does not zoom back out on blur. The palette is the first thing
             * a phone user taps, so at 14px the whole terminal ended up
             * scaled and horizontally scrolling for the rest of the session.
             */
            className="min-w-0 flex-1 text-[16px] sm:text-[14px]"
            style={{
              background: "transparent",
              border: 0,
              outline: "none",
              fontFamily: "inherit",
              fontWeight: "inherit",
              color: TERM.textBright,
            }}
          />
          <span style={{ fontSize: 11, color: TERM.textDim }}>ESC</span>
        </div>
        <div style={{ padding: "6px 0", maxHeight: "46vh", overflow: "auto" }}>
          {results.map((market) => {
            const delta = formatDelta(market.change_24h);
            return (
              <button
                key={market.slug}
                type="button"
                onClick={() => onSelectMarket(market)}
                className="grid w-full grid-cols-[16px_1fr] items-baseline gap-x-2.5 gap-y-1 px-3.5 py-2.5 sm:grid-cols-[16px_1fr_auto_auto] sm:py-2"
                style={{
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <span style={{ color: TERM.phosphor }}>▸</span>
                <span
                  className="min-w-0 break-words"
                  style={{ color: TERM.textBright, fontSize: 12.5 }}
                >
                  {market.question}
                </span>
                {/* Numbers drop under the question below `sm`; see FeedScreen. */}
                <div className="col-start-2 flex items-baseline gap-3 sm:contents">
                  <span style={{ color: TERM.textDim, fontSize: 12 }}>
                    {formatProbability(market.probability)}
                  </span>
                  <span
                    style={{
                      color:
                        delta.tone === "positive"
                          ? TERM.phosphor
                          : delta.tone === "negative"
                            ? TERM.red
                            : TERM.slate,
                      fontSize: 11.5,
                    }}
                  >
                    {delta.text}
                  </span>
                </div>
              </button>
            );
          })}
          {results.length === 0 ? (
            <div style={{ padding: "10px 14px", color: TERM.textDim, fontSize: 12.5 }}>
              No match in your feed — press Enter to analyse this as a URL or slug.
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "9px 14px",
            borderTop: `1px solid ${TERM.border}`,
            fontSize: 11,
            color: TERM.textDim,
          }}
        >
          <span>⏎ queue analysis</span>
          <span style={{ marginLeft: "auto" }}>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
