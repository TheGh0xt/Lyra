import { AnalysisRun } from "@/components/analyses/AnalysisRun";

/**
 * A Server Component that only resolves `params` and hands a plain string
 * to the client component — simpler than `use(params)` in a client
 * component, which needs a Suspense boundary to unwrap in a bare render
 * (Next's own route-level Suspense provides one in production, but nothing
 * does in a unit test that renders the client piece directly).
 *
 * `key={id}`: the App Router keeps a page's component instance mounted
 * across a navigation between two `/analyses/[id]` URLs (only the param
 * changes), so a retry's `router.replace` to a new id would otherwise leave
 * the previous run's report and stage state on screen. Keying by `id`
 * forces a fresh mount instead of a manual state reset.
 */
export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalysisRun key={id} id={id} />;
}
