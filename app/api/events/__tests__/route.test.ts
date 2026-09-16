import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { POST } from "../route";

function request(body: unknown) {
  return new Request("http://lyra.test/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  it("proxies a ui_mode_switched event to /v1/events", async () => {
    const expected = new Response(null, { status: 204 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const response = await POST(request({ name: "ui_mode_switched", ui_mode: "TERMINAL" }));

    expect(authedFetch).toHaveBeenCalledWith(
      expect.anything(),
      "/v1/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "ui_mode_switched", ui_mode: "TERMINAL" }),
      }),
    );
    expect(response).toBe(expected);
  });

  it("rejects a non-JSON body before touching auth or the network", async () => {
    vi.mocked(authedFetch).mockClear();
    const response = await POST(
      new Request("http://lyra.test/api/events", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(authedFetch).not.toHaveBeenCalled();
  });
});
