import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authedFetch", () => ({ authedFetch: vi.fn() }));

import { authedFetch } from "@/lib/api/authedFetch";
import { DELETE, POST } from "../route";

describe("POST /api/analyses/[id]/share", () => {
  it("proxies to /v1/analyses/{id}/share as an authed POST", async () => {
    const expected = new Response("{}", { status: 200 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const request = new Request("http://lyra.test/api/analyses/a1/share", { method: "POST" });
    const response = await POST(request, { params: Promise.resolve({ id: "a1" }) });

    expect(authedFetch).toHaveBeenCalledWith(
      request,
      "/v1/analyses/a1/share",
      expect.objectContaining({ method: "POST" }),
    );
    expect(response).toBe(expected);
  });
});

describe("DELETE /api/analyses/[id]/share", () => {
  it("proxies to /v1/analyses/{id}/share as an authed DELETE", async () => {
    const expected = new Response(null, { status: 204 });
    vi.mocked(authedFetch).mockResolvedValue(expected);

    const request = new Request("http://lyra.test/api/analyses/a1/share", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ id: "a1" }) });

    expect(authedFetch).toHaveBeenCalledWith(
      request,
      "/v1/analyses/a1/share",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(response).toBe(expected);
  });
});
