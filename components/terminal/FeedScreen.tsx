import { TERM, TERMINAL_TONE } from "@/lib/ui/terminalPalette";
import { formatDelta, formatProbability, formatVolume } from "@/lib/ui/format";
import type { MovingMarket } from "@/lib/api/client";

export interface FeedScreenProps {
  markets: MovingMarket[];
  loading: boolean;
  error: string | null;
  onSelect: (market: MovingMarket) => void;
}

const cellStyle = { padding: "7px 4px", fontSize: 12.5 };

/**
 * Terminal feed (UI_PRD §6.4, re-skinned for B.18).
 *
 * No EDGE or SIGNAL column: the mockup derived both from a modelled
 * probability this product doesn't compute — UI_PRD is explicit that there
 * is never an edge display. `GET /v1/markets/moving` has no signal-strength
 * field either (Layer 2's whale/skew/volume flags aren't part of this
 * response), so a "SIGNAL" tag here would be invented, not real.
 */
export function FeedScreen({ markets, loading, error, onSelect }: FeedScreenProps) {
  return (
    <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderBottom: `1px solid ${TERM.border}`,
        }}
      >
        <span style={{ color: TERM.phosphor }}>┌─</span>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim }}>
          WATCHLIST · {markets.length} markets
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 14, color: TERM.textDim, fontSize: 12.5 }}>loading…</div>
      ) : error ? (
        <div style={{ padding: 14, color: TERM.red, fontSize: 12.5 }}>! {error}</div>
      ) : markets.length === 0 ? (
        <div style={{ padding: 14, color: TERM.textDim, fontSize: 12.5 }}>
          nothing moving in your categories right now
        </div>
      ) : (
        <div style={{ padding: "0 12px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 62px 74px 82px",
              gap: 10,
              padding: "7px 4px",
              borderBottom: `1px solid ${TERM.border}`,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: TERM.textDim,
            }}
          >
            <span>MARKET</span>
            <span style={{ textAlign: "right" }}>LAST</span>
            <span style={{ textAlign: "right" }}>Δ24H</span>
            <span style={{ textAlign: "right" }}>VOL</span>
          </div>
          {markets.map((market) => {
            const delta = formatDelta(market.change_24h);
            return (
              <button
                key={market.slug}
                type="button"
                onClick={() => onSelect(market)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 62px 74px 82px",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  borderBottom: `1px solid ${TERM.borderDim}`,
                  cursor: "pointer",
                  font: "inherit",
                  ...cellStyle,
                }}
              >
                <span style={{ color: TERM.textBright, fontSize: 12.5 }}>{market.question}</span>
                <span style={{ color: TERM.text, textAlign: "right" }}>
                  {formatProbability(market.probability)}
                </span>
                <span style={{ color: TERMINAL_TONE[delta.tone], textAlign: "right" }}>
                  {delta.text}
                </span>
                <span style={{ color: TERM.textDim, textAlign: "right", fontSize: 12 }}>
                  {formatVolume(market.volume_24h)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
