import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/route-client", () => ({
  getAccessToken: vi.fn(),
}));

import { getAccessToken } from "@/lib/supabase/route-client";
import { authedFetch } from "../authedFetch";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function request() {
  return new Request("http://lyra.test/api/me", {
    headers: { cookie: "sb-access-token=whatever" },
  });
}

describe("authedFetch", () => {
  it("returns 401 without touching Cygnus when there is no session", async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    global.fetch = vi.fn();

    const response = await authedFetch(request(), "/v1/me");

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
    const payload = await response.json();
    expect(payload.type).toContain("unauthorized");
  });

  it("attaches the bearer token and forwards a successful response", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "u1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await authedFetch(request(), "/v1/me");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "u1" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/me",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer tok_123" }),
      }),
    );
  });

  it("passes an upstream error status straight through", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "mfa-required" }), {
        status: 401,
        headers: { "content-type": "application/problem+json" },
      }),
    );

    const response = await authedFetch(request(), "/v1/me");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ type: "mfa-required" });
  });

  it("returns a problem when Cygnus is unreachable", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await authedFetch(request(), "/v1/me");
    expect(response.status).toBe(502);
    const payload = await response.json();
    expect(payload.type).toContain("sagittarius-unavailable");
  });

  it("forwards method and body for a write", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await authedFetch(request(), "/v1/me/interests", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categories: ["crypto"] }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/me/interests",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ categories: ["crypto"] }),
      }),
    );
  });
});
