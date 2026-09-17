import { cygnusUrl } from "@/lib/api/client";
import { problem } from "@/lib/api/problem";
import { getAccessToken } from "@/lib/supabase/route-client";

/**
 * Fetches an analysis — for its owner, or for a holder of a share link.
 *
 * Mirrors Cygnus's own `OPTIONAL_AUTH_ROUTES` treatment of this route: a
 * session is attached when there is one, `share_token` is forwarded when
 * given, and neither is required here — Cygnus decides what a caller with
 * (or without) either is allowed to see. That's what makes `/share/[id]`
 * (no session at all) and `/analyses/[id]` (owner, always has a session)
 * able to share this one proxy.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const shareToken = new URL(request.url).searchParams.get("share_token");
  const token = await getAccessToken(request);

  const query = shareToken ? `?share_token=${encodeURIComponent(shareToken)}` : "";

  try {
    const upstream = await fetch(
      `${cygnusUrl()}/v1/analyses/${encodeURIComponent(id)}${query}`,
      { headers: token ? { authorization: `Bearer ${token}` } : {} },
    );

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(`GET /api/analyses/${id}: upstream fetch failed`, error);
    return problem("sagittarius-unavailable", "The analysis service is unreachable.", 502);
  }
}
