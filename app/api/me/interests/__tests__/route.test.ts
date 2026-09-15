import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { PUT } from "../route";

function request(body: unknown) {
  return new Request("http://lyra.test/api/me/interests", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/me/interests", () => {
  it("proxies the categories to /v1/me/interests", async () => {
    const expected = new Response("{}", { status: 200 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const response = await PUT(request({ categories: ["crypto", "politics", "ai"] }));

    expect(authedFetch).toHaveBeenCalledWith(
      expect.anything(),
      "/v1/me/interests",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ categories: ["crypto", "politics", "ai"] }),
      }),
    );
    expect(response).toBe(expected);
  });

  it("rejects a non-JSON body before touching auth or the network", async () => {
    vi.mocked(authedFetch).mockClear();
    const response = await PUT(
      new Request("http://lyra.test/api/me/interests", { method: "PUT", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(authedFetch).not.toHaveBeenCalled();
  });
});
