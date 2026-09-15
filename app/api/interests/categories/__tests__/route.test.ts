import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("GET /api/interests/categories", () => {
  it("passes the category list through without requiring a session", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ categories: [{ slug: "crypto", label: "Crypto" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ categories: [{ slug: "crypto", label: "Crypto" }] });
    expect(global.fetch).toHaveBeenCalledWith("http://cygnus.test/v1/interests/categories");
  });

  it("returns a problem when Cygnus is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET();
    expect(response.status).toBe(502);
    const payload = await response.json();
    expect(payload.type).toContain("sagittarius-unavailable");
  });
});
