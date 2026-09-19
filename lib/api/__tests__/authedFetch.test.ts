import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/route-client", () => ({
  getAccessToken: vi.fn(),
}));

import { getAccessToken } from "@/lib/supabase/route-client";
import { authedFetch } from "../authedFetch";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
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
  it("fails loud with a clear 503 when Supabase itself isn't configured, not a 401", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn();

    const response = await authedFetch(request(), "/v1/me");

    expect(response.status).toBe(503);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    const payload = await response.json();
    expect(payload.detail).toBe("Authentication is not configured.");
  });

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

  // Cygnus answers 204 on POST /v1/events, POST /v1/billing/intent,
  // DELETE /v1/analyses/{id}/share and POST /v1/analyses/{id}/feedback.
  //
  // Rebuilding those with `new Response(await upstream.text(), { status })`
  // threw `TypeError: Invalid response status code 204` — the empty string is
  // still a body, and 204 is a null-body status. The throw landed in this
  // function's own catch and surfaced as `502 sagittarius-unavailable`, so
  // every one of those four writes *succeeded* in Cygnus while the user was
  // told the service was unreachable.
  //
  // It survived because the route tests mock `authedFetch` itself and assert
  // on a hand-built 204, so the reconstruction here never ran under test.
  it.each([204, 205, 304])("relays a %i with no body instead of throwing", async (status) => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status }));

    const response = await authedFetch(request(), "/v1/events", { method: "POST" });

    expect(response.status).toBe(status);
    expect(response.body).toBeNull();
  });

  it("does not report a successful 204 write as an unreachable service", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const response = await authedFetch(request(), "/v1/billing/intent", { method: "POST" });

    expect(response.status).not.toBe(502);
  });
});
