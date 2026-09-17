import { CAUSAL_DRIVER, CLAIM_VERIFICATION, IMPACT, SOURCE_TIER } from "@/lib/ui/contract-display";
import { TERM, TERMINAL_TONE } from "@/lib/ui/terminalPalette";
import { isHonestNonResult } from "@/lib/analyses/reportStatus";
import type { MarketAnalysisReport } from "@/lib/api/client";

export interface ReportScreenProps {
  report: MarketAnalysisReport;
  /** The launching market's last-seen probability, if this run started from the feed. */
  marketLast: string | null;
}

const statBox = { padding: "9px 14px", minWidth: 132 } as const;
const statLabel = { fontSize: 11, color: TERM.textDim, letterSpacing: "0.12em" } as const;
const statValue = { fontSize: 19, color: TERM.textBright } as const;

/**
 * The report (UI_PRD §6.7), re-skinned for terminal mode.
 *
 * **No MODEL P(YES) and no EDGE stat** — the mockup's header showed both;
 * UI_PRD is explicit that this product never displays a modelled
 * probability against the market price, so those two boxes are gone
 * outright rather than re-skinned. The confidence explanation doesn't cite
 * a fabricated per-market Brier score either (the mockup's "brier 0.071
 * across 1,284 resolved markets" is invented) — B.11 only exposes an
 * aggregate calibration curve gated at n>300, nothing per-report.
 */
export function ReportScreen({ report, marketLast }: ReportScreenProps) {
  const confidencePct = Math.round(report.confidence_score * 100);
  const honestNonResult = isHonestNonResult(report);

  return (
    <section style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${TERM.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: TERM.textDim, marginBottom: 8 }}>
          REPORT {report.market_id} ·{" "}
          {new Date(report.timestamp).toISOString().replace("T", " ").slice(0, 16)} UTC
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", border: `1px solid ${TERM.border}` }}>
          {marketLast ? (
            <div style={{ ...statBox, borderRight: `1px solid ${TERM.border}` }}>
              <div style={statLabel}>MARKET LAST</div>
              <div style={statValue}>{marketLast}</div>
            </div>
          ) : null}
          <div style={statBox}>
            <div style={statLabel}>CONFIDENCE</div>
            <div style={{ ...statValue, color: TERM.phosphor }}>
              {confidencePct / 100} <span style={{ fontSize: 11, color: TERM.textDim }}>/ cap 0.90</span>
            </div>
          </div>
        </div>
      </div>

      {honestNonResult ? (
        <div style={{ margin: "14px 18px", border: `1px solid ${TERM.border}`, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim, marginBottom: 6 }}>
            NOTHING NOTABLE
          </div>
          <p style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>
            The investigation ran to completion and found no whale activity, volume spike,
            liquidity crunch, or news that explains a move worth reporting. A legitimate
            result, not a failed run.
          </p>
        </div>
      ) : (
        <>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim }}>
                PRIMARY CAUSE
              </span>
            </div>
            <div style={{ color: TERM.phosphor, fontSize: 14, marginBottom: 8 }}>
              [{CAUSAL_DRIVER[report.primary_causal_driver].label.toUpperCase()}]
            </div>
            <p style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.65, margin: 0, maxWidth: "74ch" }}>
              {report.summary}
            </p>
          </div>

          <div style={{ padding: "0 18px 14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                borderBottom: `1px solid ${TERM.border}`,
                paddingBottom: 6,
              }}
            >
              <span style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim }}>
                FINDINGS · {report.key_drivers.length}
              </span>
            </div>
            {report.key_drivers.length === 0 ? (
              <p style={{ color: TERM.textDim, fontSize: 12.5 }}>No supporting drivers cited.</p>
            ) : (
              report.key_drivers.map((driver, index) => {
                const impact = IMPACT[driver.impact];
                return (
                  <div
                    key={`${driver.type}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 1fr 110px",
                      gap: 10,
                      padding: "9px 4px",
                      borderBottom: `1px solid ${TERM.borderDim}`,
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ color: TERM.textDim, fontSize: 12 }}>
                      F-{String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div style={{ color: TERM.textBright, fontSize: 12.5, marginBottom: 2 }}>
                        {driver.type}
                      </div>
                      <div style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.55 }}>
                        {driver.evidence_summary}
                      </div>
                    </div>
                    <span
                      style={{
                        color: TERMINAL_TONE[impact.tone],
                        fontSize: 11.5,
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      [{impact.label.replace(" impact", "").toUpperCase()}]
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ margin: "4px 18px 18px", border: `1px solid ${TERM.border}`, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim, marginBottom: 6 }}>
              WHY CONFIDENCE STOPS AT 0.90
            </div>
            <p style={{ color: TERM.text, fontSize: 12.5, lineHeight: 1.7, margin: 0, maxWidth: "74ch" }}>
              Market causality can&apos;t be proven from public data, only argued from it — the
              ceiling is enforced in code. A 0.90 reading means &quot;as certain as this system is
              permitted to be&quot;, not certainty.
            </p>
          </div>
        </>
      )}

      <div style={{ padding: "0 18px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            borderBottom: `1px solid ${TERM.border}`,
            paddingBottom: 6,
          }}
        >
          <span style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim }}>
            EVIDENCE · {report.cited_sources.length} docs
          </span>
        </div>
        {report.cited_sources.length === 0 ? (
          <p style={{ color: TERM.textDim, fontSize: 12.5 }}>No cited sources for this report.</p>
        ) : (
          report.cited_sources.map((source, index) => {
            const tier = SOURCE_TIER[source.tier];
            const verification = CLAIM_VERIFICATION[source.verification];
            return (
              <div
                key={`${source.title}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 8,
                  padding: "6px 2px",
                  borderBottom: `1px solid ${TERM.borderDim}`,
                  alignItems: "baseline",
                }}
              >
                <div>
                  <div style={{ color: TERM.textBright, fontSize: 12.5 }}>{source.title}</div>
                  <div style={{ fontSize: 11, color: TERM.textDim }}>{source.publisher}</div>
                </div>
                <span
                  style={{ color: TERMINAL_TONE[tier.tone], fontSize: 11.5, whiteSpace: "nowrap" }}
                >
                  [{tier.label.toUpperCase()}]
                </span>
                <span
                  style={{ color: TERMINAL_TONE[verification.tone], fontSize: 11.5, whiteSpace: "nowrap" }}
                >
                  [{verification.label.toUpperCase()}]
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
