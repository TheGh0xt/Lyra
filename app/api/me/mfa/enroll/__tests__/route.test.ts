import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { POST } from "../route";

describe("POST /api/me/mfa/enroll", () => {
  it("proxies to /v1/me/mfa/enroll", async () => {
    const expected = new Response("{}", { status: 200 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const request = new Request("http://lyra.test/api/me/mfa/enroll", { method: "POST" });
    const response = await POST(request);

    expect(authedFetch).toHaveBeenCalledWith(
      request,
      "/v1/me/mfa/enroll",
      expect.objectContaining({ method: "POST" }),
    );
    expect(response).toBe(expected);
  });
});
