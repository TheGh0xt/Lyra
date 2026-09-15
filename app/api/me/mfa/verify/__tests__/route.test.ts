import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { POST } from "../route";

function request(body: unknown) {
  return new Request("http://lyra.test/api/me/mfa/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/me/mfa/verify", () => {
  it("proxies the code and factor id to /v1/me/mfa/verify", async () => {
    const expected = new Response("{}", { status: 200 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const response = await POST(request({ factor_id: "f1", code: "123456" }));

    expect(authedFetch).toHaveBeenCalledWith(
      expect.anything(),
      "/v1/me/mfa/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ factor_id: "f1", code: "123456" }),
      }),
    );
    expect(response).toBe(expected);
  });

  it("rejects a non-JSON body before touching auth or the network", async () => {
    vi.mocked(authedFetch).mockClear();
    const response = await POST(
      new Request("http://lyra.test/api/me/mfa/verify", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(authedFetch).not.toHaveBeenCalled();
  });
});
