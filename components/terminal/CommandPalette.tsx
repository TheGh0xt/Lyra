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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(3,3,6,0.78)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
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
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              outline: "none",
              font: "inherit",
              fontSize: 14,
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
                style={{
                  display: "grid",
                  gridTemplateColumns: "16px 1fr auto auto",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "8px 14px",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <span style={{ color: TERM.phosphor }}>▸</span>
                <span style={{ color: TERM.textBright, fontSize: 12.5 }}>{market.question}</span>
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
