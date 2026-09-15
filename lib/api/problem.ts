/**
 * RFC 9457 problem+json, built client-side.
 *
 * Every `/api/*` route needs this for its own failure paths (bad JSON body,
 * upstream unreachable, no session) — pulled out once B.16 made it the third
 * copy rather than the first.
 */
export function problem(slug: string, detail: string, status: number): Response {
  return new Response(
    JSON.stringify({
      type: `https://pmie.dev/problems/${slug}`,
      title: detail,
      status,
      detail,
    }),
    { status, headers: { "content-type": "application/problem+json" } },
  );
}
