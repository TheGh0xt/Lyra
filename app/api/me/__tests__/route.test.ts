import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { GET } from "../route";

describe("GET /api/me", () => {
  it("proxies to /v1/me with the caller's session", async () => {
    const expected = new Response("{}", { status: 200 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const request = new Request("http://lyra.test/api/me");
    const response = await GET(request);

    expect(authedFetch).toHaveBeenCalledWith(request, "/v1/me");
    expect(response).toBe(expected);
  });
});
