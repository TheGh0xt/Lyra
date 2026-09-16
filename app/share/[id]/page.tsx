import { ReportCard } from "@/components/analyses/ReportCard";
import { StatePanel } from "@/components/ui";
import { STATE_DISPLAY } from "@/lib/ui/state-display";
import { deriveViewState } from "@/lib/analyses/reportStatus";
import { cygnusUrl, describeProblem, isProblem, type AnalysisResult } from "@/lib/api/client";

/**
 * The public, read-only shared report (UI_PRD §6.7) — reachable with no
 * session at all, authorized purely by `share_token`.
 *
 * A Server Component that talks to Cygnus directly rather than going
 * through `/api/analyses/[id]`: it's still server-side code, so the
 * "browser never calls Cygnus directly" rule isn't in play, and it means
 * an anonymous visitor's very first response already has the report in it
 * — no client-side loading state for a page that has no session to check.
 */
export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share_token?: string }>;
}) {
  const { id } = await params;
  const { share_token: shareToken } = await searchParams;

  if (!shareToken) {
    return (
      <Shell>
        <StatePanel
          tag={STATE_DISPLAY.notFound}
          title="No share link here"
          body="This page needs a share token in the URL. Ask whoever sent you the link to copy it again from the report's share button."
        />
      </Shell>
    );
  }

  let result: AnalysisResult | null = null;
  let errorDetail: string | null = null;

  try {
    const response = await fetch(
      `${cygnusUrl()}/v1/analyses/${encodeURIComponent(id)}?share_token=${encodeURIComponent(shareToken)}`,
      { cache: "no-store" },
    );
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      errorDetail = describeProblem(isProblem(payload) ? payload : null);
    } else {
      result = payload as AnalysisResult;
    }
  } catch {
    errorDetail = "The analysis service is unreachable. Try again shortly.";
  }

  if (errorDetail || !result) {
    return (
      <Shell>
        <StatePanel
          tag={STATE_DISPLAY.notFound}
          title="This link doesn't work anymore"
          body={errorDetail ?? "The link may have been revoked, or the analysis no longer exists."}
        />
      </Shell>
    );
  }

  const state = deriveViewState(result);

  return (
    <Shell>
      {state.kind === "report" ? (
        <ReportCard report={state.report} shared />
      ) : (
        <StatePanel
          tag={STATE_DISPLAY.notFound}
          title="Nothing to show yet"
          body={
            state.kind === "failed"
              ? state.detail
              : "This analysis hasn't finished running. Check back shortly."
          }
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-6 py-10">{children}</div>;
}
