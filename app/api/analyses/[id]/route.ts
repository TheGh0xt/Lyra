import { cygnusUrl } from "@/lib/api/client";

/** Fetches a completed analysis. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const upstream = await fetch(
    `${cygnusUrl()}/v1/analyses/${encodeURIComponent(id)}`,
  );

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
