import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";

/**
 * Guards this route's one real job: passing `/v1/waitlist` through
 * transparently, except for the 501 case, which is expected while Cygnus
 * builds the logic behind the frozen contract and must not read as an outage.
 */

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function request(body: unknown) {
  return new Request("http://lyra.test/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  it("passes through a successful join", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ already_registered: false, position: 42 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(request({ email: "a@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ already_registered: false, position: 42 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/waitlist",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("passes through already_registered", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ already_registered: true, position: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(request({ email: "a@example.com" }));
    const payload = await response.json();
    expect(payload.already_registered).toBe(true);
  });

  it("passes through a 422 validation error", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: [{ msg: "not an email" }] }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(request({ email: "not-an-email" }));
    expect(response.status).toBe(422);
  });

  it("turns the frozen-contract 501 into a parseable problem, not a crash", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 501 }));

    const response = await POST(request({ email: "a@example.com" }));
    expect(response.status).toBe(501);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    const payload = await response.json();
    expect(payload.type).toContain("waitlist-not-open");
    expect(payload.detail).toBeTypeOf("string");
  });

  it("returns a problem when Cygnus is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await POST(request({ email: "a@example.com" }));
    expect(response.status).toBe(502);
    const payload = await response.json();
    expect(payload.type).toContain("sagittarius-unavailable");
  });

  it("rejects a non-JSON body before touching the network", async () => {
    global.fetch = vi.fn();
    const response = await POST(
      new Request("http://lyra.test/api/waitlist", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
