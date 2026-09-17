import { authedFetch } from "@/lib/api/authedFetch";

/**
 * Mints or revokes a report's public link (UI_PRD §6.7). Owner-only on
 * Cygnus's side — no allowlist entry there — so this is a plain authed
 * proxy, same shape as every other owner-only route.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return authedFetch(request, `/v1/analyses/${encodeURIComponent(id)}/share`, {
    method: "POST",
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return authedFetch(request, `/v1/analyses/${encodeURIComponent(id)}/share`, {
    method: "DELETE",
  });
}
