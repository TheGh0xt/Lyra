import { AnalysisFlow } from "@/components/AnalysisFlow";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-600 dark:text-sky-400">
          Prediction Market Intelligence Engine
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          Why did this market move?
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Deterministic signal detection over Polymarket data — whale trades,
          order-book skew, volume anomalies — combined with cited news, then
          reasoned into a causal explanation with a confidence score that gets
          re-checked 48 hours later.
        </p>
      </header>

      <AnalysisFlow />

      {/* Visible on every view, not tucked behind a link. */}
      <aside className="mt-14 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-medium">For research and informational use only</p>
        <p className="mt-1">
          Verify cited sources and market data before acting. This explains
          evidence behind price movements. It is not financial, investment,
          betting, or trading advice, it does not tell you what to bet, and it
          never places trades.
        </p>
      </aside>

      <footer className="mt-10 text-xs text-neutral-500">
        <p>
          Explanations are generated from available evidence and can be wrong.
          Confidence is capped at 90% by design, and every report is scored
          against real market behaviour after 48 hours.
        </p>
      </footer>
    </main>
  );
}
