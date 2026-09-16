import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/route-client", () => ({ getAccessToken: vi.fn() }));

import { getAccessToken } from "@/lib/supabase/route-client";
import { GET } from "../route";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function request(url: string) {
  return new Request(url);
}

describe("GET /api/analyses/[id]", () => {
  it("attaches the owner's bearer token when signed in", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await GET(request("http://lyra.test/api/analyses/a1"), { params: Promise.resolve({ id: "a1" }) });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/analyses/a1",
      expect.objectContaining({ headers: { authorization: "Bearer tok_123" } }),
    );
  });

  it("forwards share_token for an anonymous viewer, with no auth header", async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await GET(
      request("http://lyra.test/api/analyses/a1?share_token=tkn"),
      { params: Promise.resolve({ id: "a1" }) },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/analyses/a1?share_token=tkn",
      { headers: {} },
    );
  });

  it("passes through Cygnus's response status untouched", async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "no such analysis" }), { status: 404 }),
    );

    const response = await GET(
      request("http://lyra.test/api/analyses/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns a problem when Cygnus is unreachable", async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET(
      request("http://lyra.test/api/analyses/a1"),
      { params: Promise.resolve({ id: "a1" }) },
    );
    expect(response.status).toBe(502);
  });
});
