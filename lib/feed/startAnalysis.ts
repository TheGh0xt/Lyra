import { describeProblem, isProblem, type AnalysisCreated } from "@/lib/api/client";

export type StartAnalysisResult =
  | { ok: true; analysisId: string }
  | { ok: false; kind: "wall"; detail: string }
  | { ok: false; kind: "error"; detail: string };

/**
 * Starts a run from the feed (UI_PRD §6.4) or from the run page's retry.
 *
 * A 403 is always the paywall — `require_invited` and the quota check both
 * raise it under the same `quota-exceeded` slug (Cygnus's own choice: an
 * uninvited account and an over-quota one hit the same wall), so this
 * doesn't try to tell them apart. Its `detail` is used verbatim rather than
 * through `describeProblem`'s generic copy table: Cygnus crafts this message
 * per request — the real price, the real reset date, or the invite-only
 * wording — and a static override would throw that away.
 */
export async function startAnalysis(query: string, slug?: string): Promise<StartAnalysisResult> {
  let response: Response;
  try {
    response = await fetch("/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(slug ? { query, slug } : { query }),
    });
  } catch {
    return {
      ok: false,
      kind: "error",
      detail: "Couldn't reach the server. Check your connection and try again.",
    };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.status === 201) {
    return { ok: true, analysisId: (payload as AnalysisCreated).analysis_id };
  }

  const problem = isProblem(payload) ? payload : null;

  if (response.status === 403 && problem) {
    return { ok: false, kind: "wall", detail: problem.detail };
  }

  return { ok: false, kind: "error", detail: describeProblem(problem) };
}
