import type { Stage } from "@/lib/api/stages";

/**
 * Terminal-styled short names for the real four pipeline stages.
 *
 * The mockup invents six (INGEST/SOURCES/XCHECK/PRICEMODEL/CONFIDENCE/
 * COMPOSE), including a claim-verification stage and a price-model stage
 * that don't exist in the real pipeline — `lib/api/stages.ts`'s `STAGES` is
 * the frozen SSE vocabulary, and B.18 re-skins onto the real contract, not
 * the mockup's fictional one. These four map onto it directly.
 */
export const TERMINAL_STAGE_LABEL: Record<Stage, string> = {
  event_retrieval: "INGEST",
  signal_retrieval: "SIGNALS",
  news_retrieval: "SOURCES",
  analysis: "COMPOSE",
};

export const TERMINAL_STAGE_NOTE: Record<Stage, string> = {
  event_retrieval: "market + venue resolution",
  signal_retrieval: "whale trades, order-book skew, volume",
  news_retrieval: "retrieve, dedupe, freshness gate",
  analysis: "causal synthesis + confidence ceiling",
};
