"use client";

import {
  Badge,
  Button,
  Card,
  CardEyebrow,
  CardTitle,
  ConfidenceMeter,
  Disclaimer,
  EvidenceBlock,
  Input,
  StageIndicator,
  StageList,
  StatePanel,
  ThemeToggle,
} from "@/components/ui";
import {
  CAUSAL_DRIVER,
  CLAIM_VERIFICATION,
  IMPACT,
  RECHECK,
  SOURCE_TIER,
} from "@/lib/ui/contract-display";
import { STAGE_LABELS, STAGES } from "@/lib/api/stages";
import type { StageState } from "@/components/ui";

/**
 * The component gallery.
 *
 * Not a screen — a proof. Every component renders here against both themes, so
 * a token change is checked once instead of being discovered on whichever
 * screen happens to use it. Keep it exhaustive: a component missing from this
 * page is a component nobody looks at until it breaks in production.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3.5">
      <CardTitle className="text-[13px]">{title}</CardTitle>
      {children}
    </Card>
  );
}

const STAGE_STATES: StageState[] = ["done", "active", "pending", "failed"];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-display text-[28px] font-bold tracking-[-0.03em]">
            Component library
          </h1>
          <p className="m-0 mt-1.5 font-sans text-sm text-dim">
            Every piece renders from the same tokens, so the theme toggle is the only
            switch needed.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
        <p className="m-0 font-sans text-xs text-faint">
          Tab through these — the focus ring is keyboard-only by design.
        </p>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Default" placeholder="polymarket.com/event/…" />
          <Input label="With hint" placeholder="you@example.com" hint="Used only to sign you in." />
          <Input label="Invalid" defaultValue="not-an-email" error="That address is missing an @" />
        </div>
      </Section>

      <Section title="Impact — icon-paired, never colour alone">
        <div className="flex flex-wrap gap-2.5">
          {Object.values(IMPACT).map((d) => (
            <Badge key={d.label} display={d} />
          ))}
        </div>
      </Section>

      <Section title="Source tier and claim verification (report v2)">
        <div className="flex flex-wrap gap-2.5">
          {Object.values(SOURCE_TIER).map((d) => (
            <Badge key={d.label} display={d} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {Object.values(CLAIM_VERIFICATION).map((d) => (
            <Badge key={d.label} display={d} />
          ))}
        </div>
      </Section>

      <Section title="Primary causal driver">
        <div className="flex flex-wrap gap-2.5">
          {Object.values(CAUSAL_DRIVER).map((d) => (
            <Badge key={d.label} display={d} />
          ))}
        </div>
      </Section>

      <Section title="48-hour re-check verdict">
        <div className="flex flex-wrap gap-2.5">
          {Object.values(RECHECK).map((d) => (
            <Badge key={d.label} display={d} />
          ))}
        </div>
      </Section>

      <Section title="Confidence meter">
        <div className="grid gap-6 sm:grid-cols-2">
          <ConfidenceMeter
            score={0.78}
            note="Three independent signals agree on timing and direction"
          />
          <ConfidenceMeter score={0.52} note="Order flow is clear; news coverage is thin" />
          <ConfidenceMeter score={0.28} note="No signal exceeded its threshold" />
          <ConfidenceMeter score={0.9} note="At the permanent ceiling" />
        </div>
      </Section>

      <Section title="Four-stage indicator">
        <StageList>
          {STAGES.map((stage, index) => (
            <StageIndicator
              key={stage}
              label={STAGE_LABELS[stage]}
              state={STAGE_STATES[index]}
            />
          ))}
        </StageList>
      </Section>

      <Section title="Evidence blocks">
        <EvidenceBlock
          title="Whale accumulation"
          kind="Order flow"
          badge={IMPACT.HIGH}
          body="Three wallets bought YES for $214k combined between 09:40 and 11:05 UTC. Largest single fill was $96k, taken across the book rather than resting on the bid — a buyer in a hurry."
          provenance="Polymarket trade log · 14 Aug 2026 11:05 UTC"
        />
        <EvidenceBlock
          title="ETF inflows reach a single-day record"
          kind="Reuters"
          badge={SOURCE_TIER.PRIMARY}
          secondaryBadge={CLAIM_VERIFICATION.SUPPORTS}
          body="Net inflows of $412m on 14 August, the largest single day since launch."
          provenance="Reuters · 14 Aug 2026 10:40 UTC"
        />
        <EvidenceBlock
          title="Analyst note calls the move 'unsupported by flows'"
          kind="Trade press"
          badge={SOURCE_TIER.WEAK}
          secondaryBadge={CLAIM_VERIFICATION.CONTRADICTS}
          body="Shown rather than dropped: evidence against the stated cause is what makes the confidence figure mean anything."
          provenance="Unattributed commentary · 14 Aug 2026 13:02 UTC"
        />
      </Section>

      <Section title="Empty and error states">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatePanel
            tag={RECHECK.PENDING}
            title="Your feed starts tomorrow"
            body="We need one day of price history in your categories before ranking anything by movement. Meanwhile, paste a market URL and we'll explain it now."
            action={{ label: "Paste a URL" }}
          />
          <StatePanel
            tag={RECHECK.CONFIRMED}
            title="Nothing notable happened"
            body="No whale activity, no volume anomaly and no news. A 3-point drift on thin volume is just noise. This didn't count against your allowance."
            action={{ label: "Analyse a different market" }}
          />
        </div>
      </Section>

      <Section title="Disclaimer">
        <Disclaimer />
        <div className="overflow-hidden rounded-[13px] border border-line">
          <Disclaimer variant="bar" />
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-2">
          <div className="font-display text-[28px] font-bold tracking-[-0.03em]">
            Space Grotesk · headings
          </div>
          <div className="font-sans text-[15px] text-dim">
            Inter · body copy, comfortable at long-form reading sizes
          </div>
          <div className="font-mono text-[15px]">
            JetBrains Mono · 63% · $1.84M · +22 pts · tabular by default
          </div>
          <CardEyebrow>Eyebrow · figure captions</CardEyebrow>
        </div>
      </Section>
    </main>
  );
}
