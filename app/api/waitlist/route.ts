import { cygnusUrl } from "@/lib/api/client";

/**
 * Joins the beta waitlist.
 *
 * A thin proxy, same shape as `/api/analyses` — it keeps the Cygnus address
 * server-side. The one difference: `/v1/waitlist` is a stub in the frozen
 * contract today (B.1 froze the shape before Cygnus built the logic behind
 * it), so a 501 from upstream is an expected response, not a failure. It is
 * passed through as-is rather than swallowed, so the client can render an
 * honest "not open yet" state instead of a fake success.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem("invalid-request", "Request body must be JSON.", 400);
  }

  try {
    const upstream = await fetch(`${cygnusUrl()}/v1/waitlist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    // A 501 carries no JSON body per the contract — Cygnus says so in the
    // spec's description ("Not implemented yet"). Forward the status but
    // give the client a body it can actually parse.
    if (upstream.status === 501) {
      return problem(
        "waitlist-not-open",
        "The waitlist isn't accepting sign-ups yet.",
        501,
      );
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return problem(
      "sagittarius-unavailable",
      "The waitlist service is unreachable.",
      502,
    );
  }
}

function problem(slug: string, detail: string, status: number) {
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
