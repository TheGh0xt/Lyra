import { Button, Card } from "@/components/ui";
import { TONE_CLASSES } from "@/lib/ui/tone";
import { formatDelta, formatProbability, formatVolume } from "@/lib/ui/format";
import { MARKET_SOURCE } from "@/lib/ui/contract-display";
import type { MovingMarket } from "@/lib/api/client";

export interface MarketCardProps {
  market: MovingMarket;
  onExplain: (market: MovingMarket) => void;
  disabled?: boolean;
}

/** One market row on the feed (UI_PRD §6.4). */
export function MarketCard({ market, onExplain, disabled }: MarketCardProps) {
  const delta = formatDelta(market.change_24h);
  const tone = TONE_CLASSES[delta.tone];
  const source = MARKET_SOURCE[market.source === "KALSHI" ? "KALSHI" : "POLYMARKET"];

  return (
    <Card className="flex flex-wrap items-center gap-4">
      <div className="min-w-[220px] flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-elev px-2 py-0.5 font-sans text-[11px] font-medium text-dim">
            <span aria-hidden="true" className="text-violet-text">
              {source.glyph}
            </span>
            {source.label}
          </span>
          <span className="font-sans text-[11px] text-faint">{market.category}</span>
        </div>
        <div className="font-display text-base font-semibold leading-snug tracking-[-0.01em] text-text">
          {market.question}
        </div>
      </div>

      <div className="min-w-[100px] text-right">
        <div className="font-mono text-2xl font-medium tabular-nums text-text">
          {formatProbability(market.probability)}
        </div>
        <div
          className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[13px] tabular-nums ${tone.soft} ${tone.fg}`}
        >
          {delta.text}
        </div>
        <div className="mt-1.5 font-sans text-[11px] text-faint">
          {formatVolume(market.volume_24h)} · 24h
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onExplain(market)}
        disabled={disabled}
        className="whitespace-nowrap"
      >
        Explain this move
      </Button>
    </Card>
  );
}
