import type {
  CausalDriver,
  Impact,
  MarketAnalysisReport,
} from "@/lib/api/client";

/**
 * Renders a MarketAnalysisReport.
 *
 * Every field of the schema is displayed, including `historical_context_match`
 * — which is null today and starts arriving in Phase 4. Silently dropping a
 * field would hide evidence the report is making claims from.
 */

const DRIVER_LABELS: Record<CausalDriver, string> = {
  WHALE_ACTIVITY: "Whale activity",
  VOLUME_SPIKE: "Volume spike",
  LIQUIDITY_CRUNCH: "Liquidity crunch",
  EXTERNAL_NEWS: "External news",
  UNKNOWN_ANOMALY: "Unexplained anomaly",
};

const IMPACT_STYLES: Record<Impact, string> = {
  HIGH: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  MEDIUM: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  LOW: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function ReportView({ report }: { report: MarketAnalysisReport }) {
  const confidence = Math.round(report.confidence_score * 100);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Primary driver
        </p>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          {DRIVER_LABELS[report.primary_causal_driver]}
        </h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {report.summary}
        </p>
      </header>

      <section aria-label="Confidence">
        <div className="mb-1 flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Confidence
          </p>
          <p className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
            {confidence}%
          </p>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          role="meter"
          aria-valuenow={confidence}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Confidence score"
        >
          <div
            className="h-full rounded-full bg-sky-500 dark:bg-sky-400"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Capped at 90% by design. Re-scored 48 hours later against what the
          market actually did.
        </p>
      </section>

      <section aria-label="Evidence" className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Evidence
        </p>
        {report.key_drivers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No supporting drivers were cited for this report.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.key_drivers.map((driver, index) => (
              <li
                key={`${driver.type}-${index}`}
                className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {driver.type}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${IMPACT_STYLES[driver.impact]}`}
                  >
                    {driver.impact}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {driver.evidence_summary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Historical parallel">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Historical parallel
        </p>
        {report.historical_context_match ? (
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            Market{" "}
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
              {report.historical_context_match.previous_market_id}
            </code>
            , prior explanation accuracy{" "}
            {Math.round(
              report.historical_context_match.prior_explanation_accuracy * 100,
            )}
            %
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            None found. Semantic matching over past reports arrives with the
            memory layer.
          </p>
        )}
      </section>

      <footer className="border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800">
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex gap-1">
            <dt>Market</dt>
            <dd className="font-mono">{report.market_id}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Generated</dt>
            <dd>
              <time dateTime={report.timestamp}>
                {new Date(report.timestamp).toISOString().replace("T", " ").slice(0, 19)} UTC
              </time>
            </dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}
