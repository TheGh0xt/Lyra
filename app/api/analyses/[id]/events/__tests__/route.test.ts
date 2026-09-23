import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/route-client", () => ({ getAccessToken: vi.fn() }));

import { getAccessToken } from "@/lib/supabase/route-client";
import { GET, maxDuration } from "../route";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("GET /api/analyses/[id]/events", () => {
  it("401s locally without reaching Cygnus when there is no session", async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    global.fetch = vi.fn();

    const response = await GET(new Request("http://lyra.test/api/analyses/a1/events"), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("attaches the bearer token and streams the upstream body through", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    const body = new ReadableStream();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }),
    );

    const response = await GET(new Request("http://lyra.test/api/analyses/a1/events"), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/analyses/a1/events",
      expect.objectContaining({
        headers: { accept: "text/event-stream", authorization: "Bearer tok_123" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
  });

  it("passes through an upstream error without trying to stream it", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));

    const response = await GET(new Request("http://lyra.test/api/analyses/a1/events"), {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(response.status).toBe(404);
  });

  // LYR-03. Every other proxy in the app wraps its upstream fetch; this one
  // did not, so an unreachable Cygnus escaped as a TypeError and Next served
  // its HTML 500 page. The client cannot parse HTML as problem+json, so it
  // compounded with LYR-02 into the same silent hang.
  it("returns problem+json, not an unhandled throw, when Cygnus is unreachable", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const response = await GET(new Request("http://lyra.test/api/analyses/a1/events"), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    const body = (await response.json()) as { type: string; detail: string };
    expect(body.type).toMatch(/sagittarius-unavailable|upstream-unreachable/);
    expect(body.detail).toBeTruthy();
  });

  it("logs the caught upstream failure rather than swallowing it", async () => {
    // F6's rule, applied here: a proxy that fails silently leaves nothing in
    // the Vercel logs to explain a user-visible hang.
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await GET(new Request("http://lyra.test/api/analyses/a1/events"), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(error).toHaveBeenCalled();
  });

  it("relays a 204 instead of throwing on an empty body", async () => {
    // The Lyra#28 class bug, which this route still had its own copy of:
    // `new Response(await upstream.text(), { status: 204 })` throws
    // `TypeError: Invalid response status code 204`, because the empty
    // string text() returns still counts as a body.
    vi.mocked(getAccessToken).mockResolvedValue("tok_123");
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const response = await GET(new Request("http://lyra.test/api/analyses/a1/events"), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(response.status).toBe(204);
  });

  it("declares a maxDuration that outlives the 15s platform default", async () => {
    // An analysis takes 60-120s. Next-on-Vercel defaults to 15s, so every
    // run was cut mid-stream; nothing in the repo made that visible.
    expect(maxDuration).toBeGreaterThanOrEqual(60);
  });
});
