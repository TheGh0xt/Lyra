import Link from "next/link";
import { Badge, Card, CardEyebrow, CardTitle, ConfidenceMeter, Disclaimer, EvidenceBlock, Owl } from "@/components/ui";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { CAUSAL_DRIVER, CLAIM_VERIFICATION, IMPACT, SOURCE_TIER } from "@/lib/ui/contract-display";
import { STAGES, STAGE_LABELS, STAGE_DETAIL } from "@/lib/api/stages";

/**
 * The public landing page (UI_PRD §6.1).
 *
 * Unauthenticated, marketing surface — the one screen every visitor sees
 * before deciding whether PMIE is worth their email address. The private
 * beta has no open signup yet, so the call to action throughout is the
 * waitlist, not "sign up".
 */

const STEP_COPY: Record<(typeof STAGES)[number], string> = {
  event_retrieval: "Pulls the event and every one of its markets straight from Polymarket — no stale cache.",
  signal_retrieval: "A deterministic Go engine flags whale-sized trades, order-book skew and volume anomalies. No model runs yet.",
  news_retrieval: "Searches for dated, citable news on the real-world subject the market tracks.",
  analysis: "Weighs the evidence and writes a causal explanation — with a confidence score capped at 90%, on principle.",
};

const EXAMPLE_REPORT = {
  question: "Will Spain win the 2026 FIFA World Cup?",
  primaryDriver: CAUSAL_DRIVER.EXTERNAL_NEWS,
  confidence: 0.9,
  summary:
    "Spain's implied probability surged to 99.9% within minutes of the final whistle. The move is fully explained by the match result itself, reported near-simultaneously by every major outlet — not by unusual order flow beforehand.",
  drivers: [
    {
      title: "Match result reported across major outlets",
      kind: "News · Reuters, AP, ESPN",
      badge: IMPACT.HIGH,
      body: "News 'Spain crowned 2026 FIFA World Cup Champions.' on July 19, 2026, directly caused Spain's probability to surge to 99.9%.",
      provenance: "Reuters · 19 Jul 2026 21:47 UTC",
    },
    {
      title: "No abnormal order flow ahead of the result",
      kind: "Order flow",
      badge: IMPACT.LOW,
      body: "Trade volume in the two hours before full time was in line with the market's recent median — this was not front-run.",
      provenance: "Polymarket trade log · 19 Jul 2026 19:30–21:45 UTC",
    },
    {
      title: "Independent live-blog corroboration",
      kind: "The Athletic",
      badge: SOURCE_TIER.PRIMARY,
      secondaryBadge: CLAIM_VERIFICATION.SUPPORTS,
      body: "Minute-by-minute coverage confirms the same final score and timestamp used above.",
      provenance: "The Athletic · 19 Jul 2026 21:48 UTC",
    },
  ],
};

export default function LandingPage() {
  return (
    <main className="flex flex-col">
      {/* ---------- Header ---------- */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-base font-bold tracking-[-0.02em] text-text">
          PMIE
        </Link>
        <nav className="flex items-center gap-5 font-sans text-sm text-dim">
          <a href="#how-it-works" className="hover:text-text">How it works</a>
          <a href="#accuracy" className="hover:text-text">Accuracy</a>
          <a href="#pricing" className="hover:text-text">Pricing</a>
          <Link href="/analyze" className="hover:text-text">Try a live example</Link>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-10 sm:pt-16">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-violet-text">
          Prediction Market Intelligence Engine
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-text sm:text-[56px]">
          Why did this market move?
        </h1>
        <p className="mt-5 max-w-xl font-sans text-[17px] leading-relaxed text-dim">
          PMIE investigates a Polymarket price move — whale trades, volume spikes,
          thin liquidity, breaking news — and writes a cited explanation with a
          confidence score. Then, two days later, it checks its own homework.
        </p>

        <div className="mt-8 max-w-xl">
          <WaitlistForm />
          <p className="mt-2.5 font-sans text-xs text-faint">
            Private beta. No credit card, ever. We&apos;ll email your invite.
          </p>
        </div>

        <p className="mt-10 font-sans text-xs text-faint">
          Evidence, not prophecy.{" "}
          <Link href="/analyze" className="text-violet-text hover:underline">
            See a live analysis run →
          </Link>
        </p>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-6 py-16">
        <CardEyebrow>How it works</CardEyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">
          Four sequential steps, run on every request
        </h2>
        <p className="mt-3 max-w-xl font-sans text-sm text-dim">
          A full analysis takes 60–120 seconds because it genuinely does this
          much work — nothing here is a canned template.
        </p>

        <ol className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, index) => (
            <li key={stage}>
              <Card className="h-full">
                <div className="font-mono text-xs font-semibold text-faint">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <CardTitle className="mt-2 text-[15px]">{STAGE_LABELS[stage]}</CardTitle>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-dim">
                  {STEP_COPY[stage]}
                </p>
                <p className="mt-3 font-mono text-[11px] text-faint">{STAGE_DETAIL[stage]}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Live example report ---------- */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <CardEyebrow>A real explanation, not a mockup</CardEyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">
          Read a full report
        </h2>

        <Card className="mt-8 flex flex-col gap-6">
          <div>
            <CardEyebrow>{EXAMPLE_REPORT.question}</CardEyebrow>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <Badge display={EXAMPLE_REPORT.primaryDriver} />
            </div>
            <p className="mt-3 max-w-2xl font-sans text-[15px] leading-relaxed text-text">
              {EXAMPLE_REPORT.summary}
            </p>
          </div>

          <ConfidenceMeter
            score={EXAMPLE_REPORT.confidence}
            note="Three independent items agree on timing and direction"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLE_REPORT.drivers.map((driver) => (
              <EvidenceBlock key={driver.title} {...driver} />
            ))}
          </div>
        </Card>

        <p className="mt-4 font-sans text-xs text-faint">
          Run against a live World Cup market, July 2026 — see UI_PRD Appendix B. This one
          isn&apos;t hypothetical.
        </p>
      </section>

      {/* ---------- Accuracy record ---------- */}
      <section id="accuracy" className="mx-auto w-full max-w-5xl px-6 py-16">
        <CardEyebrow>The differentiator</CardEyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">
          The accuracy record
        </h2>
        <p className="mt-3 max-w-xl font-sans text-sm text-dim">
          Every explanation is scored automatically 48 hours later against what
          the market actually did. Confidence is adjusted per outcome — including
          when we&apos;re wrong. That record will be published here, in full,
          broken down by cause type. No cherry-picking.
        </p>

        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Owl size={52} />
          <div className="font-display text-[15px] font-semibold text-text">
            Collecting data
          </div>
          <p className="max-w-md font-sans text-[13px] leading-relaxed text-dim">
            A calibration curve needs a meaningful sample of scored reports before
            it means anything — showing one too early would mislead rather than
            inform. This container is built and wired; it fills in as reports
            clear their 48-hour re-check.
          </p>
        </Card>
      </section>

      {/* ---------- What it is not ---------- */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <CardEyebrow>What this is not</CardEyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">
          Research tooling, not a trading signal
        </h2>
        <div className="mt-6 max-w-2xl">
          <Disclaimer />
        </div>
        <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-dim">
          PMIE never tells you what to bet, never places a trade, and never
          shows a modelled probability against the market price. It explains
          evidence behind a move that already happened. Verify every cited
          source yourself before acting on anything you read here.
        </p>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="mx-auto w-full max-w-5xl px-6 py-16">
        <CardEyebrow>Pricing</CardEyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">
          Usage credits, with a real free tier
        </h2>
        <p className="mt-3 max-w-xl font-sans text-sm text-dim">
          Every analysis costs real money to run — model reasoning plus grounded
          news search — so pricing tracks usage rather than a flat fee. No
          credit card at sign-up, ever.
        </p>

        <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
          <Card className="flex flex-col gap-2">
            <CardTitle className="text-[15px]">Free</CardTitle>
            <p className="font-mono text-2xl font-medium text-text">5<span className="text-sm text-faint"> / month</span></p>
            <p className="font-sans text-[13px] leading-relaxed text-dim">
              Enough to point PMIE at markets you actually care about and judge
              it on real output.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <CardTitle className="text-[15px]">Pro</CardTitle>
            <p className="font-mono text-2xl font-medium text-text">TBD</p>
            <p className="font-sans text-[13px] leading-relaxed text-dim">
              A larger monthly allowance, with overage sold in packs. Priced
              once real cost-per-analysis is measured.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <CardTitle className="text-[15px]">API</CardTitle>
            <p className="font-mono text-2xl font-medium text-text">TBD</p>
            <p className="font-sans text-[13px] leading-relaxed text-dim">
              Metered access for quant and trading-tool builders. Structured,
              scored, cited explanations — no UI required.
            </p>
          </Card>
        </div>
        <p className="mt-4 font-sans text-xs text-faint">
          Beta users are grandfathered into their free-tier access. That&apos;s a
          promise we intend to keep publicly.
        </p>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <Card className="flex flex-col items-start gap-4 bg-elev sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Get on the list</CardTitle>
            <p className="mt-1.5 max-w-md font-sans text-sm text-dim">
              5–10 invites are going out during the private beta. We&apos;ll email
              you the moment yours is ready.
            </p>
          </div>
          <WaitlistForm className="w-full sm:w-auto sm:min-w-[360px]" />
        </Card>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-sm font-semibold text-text">PMIE</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-xs text-faint">
            <span>Terms (coming soon)</span>
            <span>Privacy (coming soon)</span>
            <a href="mailto:hello@pmie.dev" className="hover:text-dim">Contact</a>
            <span>Status: operational</span>
          </div>
        </div>
        <p className="mt-4 font-sans text-[11px] leading-relaxed text-faint">
          PMIE is research and informational tooling. Nothing on this site is
          financial, investment, betting or trading advice, and PMIE never
          places a trade.
        </p>
      </footer>
    </main>
  );
}
