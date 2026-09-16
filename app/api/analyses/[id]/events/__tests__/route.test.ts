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
});
