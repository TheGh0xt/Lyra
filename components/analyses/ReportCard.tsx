import {
  Badge,
  Card,
  CardEyebrow,
  CardTitle,
  ConfidenceMeter,
  Disclaimer,
  EvidenceBlock,
  StatePanel,
} from "@/components/ui";
import {
  CAUSAL_DRIVER,
  CLAIM_VERIFICATION,
  IMPACT,
  SOURCE_TIER,
} from "@/lib/ui/contract-display";
import { isHonestNonResult } from "@/lib/analyses/reportStatus";
import { STATE_DISPLAY } from "@/lib/ui/state-display";
import type { CitedSource, MarketAnalysisReport } from "@/lib/api/client";

function citationBody(source: CitedSource): string {
  // CitedSource carries no free-text summary of its own — tier and
  // verification are already badges, so their existing explanatory `hint`
  // copy (lib/ui/contract-display.ts) doubles as the body text instead of
  // inventing new prose per citation.
  return `${SOURCE_TIER[source.tier].hint} ${CLAIM_VERIFICATION[source.verification].hint}`;
}

function citationProvenance(source: CitedSource): string {
  if (!source.published_at) return source.publisher;
  const date = new Date(source.published_at).toISOString().slice(0, 10);
  return `${source.publisher} · ${date}`;
}

function Footer({ report }: { report: MarketAnalysisReport }) {
  return (
    <footer className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 font-mono text-[11px] text-faint">
      <span>
        market <code>{report.market_id}</code>
      </span>
      <time dateTime={report.timestamp}>
        {new Date(report.timestamp).toISOString().replace("T", " ").slice(0, 19)} UTC
      </time>
    </footer>
  );
}

/**
 * Renders a `MarketAnalysisReport` (UI_PRD §6.7) — shared by the owner's
 * live view (`/analyses/[id]`) and the public shared view (`/share/[id]`),
 * which differ only in the banner and in who gets share controls.
 *
 * **No 48-hour re-check block.** The mockup (`PMIE Report.dc.html`) shows
 * one, but the contract has no per-report recheck field — B.11 exposes
 * only the aggregate `/v1/calibration` curve (already on the landing page),
 * not an outcome or adjusted confidence on this report. Rather than
 * fabricate one, it's omitted; a real per-report field is a backend
 * follow-up, not a Lyra decision to make silently.
 */
export function ReportCard({ report, shared }: { report: MarketAnalysisReport; shared?: boolean }) {
  const honestNonResult = isHonestNonResult(report);

  return (
    <article className="flex flex-col gap-6">
      {shared ? (
        <div className="flex items-center gap-2.5 rounded-[11px] border border-line bg-elev px-3.5 py-2.5">
          <span aria-hidden="true" className="text-violet-text">
            ⚭
          </span>
          <span className="font-sans text-[12.5px] font-medium text-dim">
            Public read-only report. Anyone with this link sees it, including the disclaimer.
          </span>
        </div>
      ) : null}

      {honestNonResult ? (
        <StatePanel
          tag={STATE_DISPLAY.honestResult}
          title="Nothing notable happened"
          body="The investigation ran to completion and found no whale activity, volume spike, liquidity crunch, or news that explains a move worth reporting. That's a legitimate result, not a failed run."
        />
      ) : (
        <>
          <header>
            <CardEyebrow>Primary cause</CardEyebrow>
            <div className="mt-2">
              <Badge display={CAUSAL_DRIVER[report.primary_causal_driver]} />
            </div>
            <p className="mt-3 font-sans text-[15px] leading-relaxed text-text">{report.summary}</p>
          </header>

          <Card level="elev" className="flex flex-col gap-2">
            <ConfidenceMeter score={report.confidence_score} />
            <p className="m-0 border-t border-line pt-2.5 font-sans text-[12.5px] leading-relaxed text-faint">
              Confidence never exceeds 90%. Market causality can&apos;t be proven from public
              data, only argued from it — a 100% reading would be a lie with a progress bar.
            </p>
          </Card>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle>Key drivers</CardTitle>
              <span className="font-mono text-[11.5px] text-faint">
                {report.key_drivers.length}
              </span>
            </div>
            {report.key_drivers.length === 0 ? (
              <p className="m-0 font-sans text-sm text-dim">
                No supporting drivers were cited for this report.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {report.key_drivers.map((driver, index) => (
                  <EvidenceBlock
                    key={`${driver.type}-${index}`}
                    title={driver.type}
                    badge={IMPACT[driver.impact]}
                    body={driver.evidence_summary}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <CardTitle>Historical parallel</CardTitle>
            {report.historical_context_match ? (
              <Card level="elev">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="font-mono text-sm text-text">
                    market {report.historical_context_match.previous_market_id}
                  </span>
                  <span className="font-mono text-sm text-faint">
                    prior accuracy{" "}
                    {Math.round(report.historical_context_match.prior_explanation_accuracy * 100)}%
                  </span>
                </div>
              </Card>
            ) : (
              <div className="rounded-[12px] border border-dashed border-line-2 p-4 text-center">
                <p className="m-0 font-sans text-[13px] text-dim">
                  No comparable past move was found for this market.
                </p>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <CardTitle>Cited sources</CardTitle>
            {report.cited_sources.length === 0 ? (
              <p className="m-0 font-sans text-sm text-dim">{STATE_DISPLAY.noNews.hint}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {report.cited_sources.map((source, index) => (
                  <EvidenceBlock
                    key={`${source.title}-${index}`}
                    title={source.title}
                    badge={SOURCE_TIER[source.tier]}
                    secondaryBadge={CLAIM_VERIFICATION[source.verification]}
                    body={citationBody(source)}
                    provenance={citationProvenance(source)}
                    href={source.url ?? undefined}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Disclaimer />
      <Footer report={report} />
    </article>
  );
}
