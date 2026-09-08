import Link from "next/link";
import { AnalysisFlow } from "@/components/AnalysisFlow";
import { Disclaimer } from "@/components/ui";

/**
 * The interactive analysis flow from Phase 2 (ROADMAP 2.3-2.7).
 *
 * Lived at `/` until B.15 moved the marketing landing page there. It will be
 * folded into the authenticated feed → analysis → report spine in B.17,
 * re-skinned onto the design system; until then this keeps the working demo
 * reachable rather than deleting functioning code mid-push.
 */
export default function AnalyzePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <Link
          href="/"
          className="text-xs font-medium text-faint hover:text-dim"
        >
          ← PMIE
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-violet-text">
          Prediction Market Intelligence Engine
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Why did this market move?
        </h1>
        <p className="mt-3 max-w-2xl text-dim">
          Deterministic signal detection over Polymarket data — whale trades,
          order-book skew, volume anomalies — combined with cited news, then
          reasoned into a causal explanation with a confidence score that gets
          re-checked 48 hours later.
        </p>
      </header>

      <AnalysisFlow />

      <Disclaimer className="mt-14" />

      <footer className="mt-10 text-xs text-faint">
        <p>
          Explanations are generated from available evidence and can be wrong.
          Confidence is capped at 90% by design, and every report is scored
          against real market behaviour after 48 hours.
        </p>
      </footer>
    </main>
  );
}
