import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { GET } from "../route";

describe("GET /api/markets/moving", () => {
  it("proxies to /v1/markets/moving with the caller's session", async () => {
    const expected = new Response("{}", { status: 200 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const request = new Request("http://lyra.test/api/markets/moving");
    const response = await GET(request);

    expect(authedFetch).toHaveBeenCalledWith(request, "/v1/markets/moving");
    expect(response).toBe(expected);
  });
});
