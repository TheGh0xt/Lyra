import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { POST } from "../route";

function request(body: unknown) {
  return new Request("http://lyra.test/api/billing/intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/intent", () => {
  it("proxies the price and plan shown to /v1/billing/intent", async () => {
    const expected = new Response(null, { status: 204 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const response = await POST(request({ price_shown_usd: 19, plan: "pro-monthly" }));

    expect(authedFetch).toHaveBeenCalledWith(
      expect.anything(),
      "/v1/billing/intent",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ price_shown_usd: 19, plan: "pro-monthly" }),
      }),
    );
    expect(response).toBe(expected);
  });

  it("rejects a non-JSON body before touching auth or the network", async () => {
    vi.mocked(authedFetch).mockClear();
    const response = await POST(
      new Request("http://lyra.test/api/billing/intent", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(authedFetch).not.toHaveBeenCalled();
  });
});
