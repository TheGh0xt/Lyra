import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { POST } from "../route";

function request(body: unknown) {
  return new Request("http://lyra.test/api/analyses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyses", () => {
  it("proxies the query to /v1/analyses with the caller's session", async () => {
    const expected = new Response("{}", { status: 201 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const response = await POST(request({ query: "world-cup-winner" }));

    expect(authedFetch).toHaveBeenCalledWith(
      expect.anything(),
      "/v1/analyses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "world-cup-winner" }),
      }),
    );
    expect(response).toBe(expected);
  });

  it("passes through Cygnus's 403 quota-exceeded untouched, for the paywall to render", async () => {
    const quotaExceeded = new Response(
      JSON.stringify({
        type: "https://pmie.dev/problems/quota-exceeded",
        title: "Quota exceeded",
        status: 403,
        detail: "You've used all 5 analyses for this month.",
      }),
      { status: 403, headers: { "content-type": "application/problem+json" } },
    );
    vi.mocked(authedFetch).mockResolvedValue(quotaExceeded);

    const response = await POST(request({ query: "world-cup-winner" }));
    expect(response).toBe(quotaExceeded);
  });

  it("rejects a non-JSON body before touching auth or the network", async () => {
    vi.mocked(authedFetch).mockClear();
    const response = await POST(
      new Request("http://lyra.test/api/analyses", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(authedFetch).not.toHaveBeenCalled();
  });
});
