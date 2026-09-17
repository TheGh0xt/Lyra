import { afterEach, describe, expect, it, vi } from "vitest";
import { startAnalysis } from "../startAnalysis";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("startAnalysis", () => {
  it("returns the new analysis id on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ analysis_id: "a1", stream_url: "/v1/analyses/a1/events", status: "running" }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );

    expect(await startAnalysis("world-cup-winner")).toEqual({ ok: true, analysisId: "a1" });
  });

  it("includes slug in the request body when the caller knows it", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ analysis_id: "a1", stream_url: "x", status: "running" }), {
        status: 201,
      }),
    );

    await startAnalysis("Will Spain win?", "spain-world-cup");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/analyses",
      expect.objectContaining({
        body: JSON.stringify({ query: "Will Spain win?", slug: "spain-world-cup" }),
      }),
    );
  });

  it("classifies a 403 as the wall, carrying Cygnus's own message verbatim", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/quota-exceeded",
          title: "Quota exceeded",
          status: 403,
          detail: "You've used all 5 analyses for this month. Upgrade to Pro ($19/month)...",
        }),
        { status: 403, headers: { "content-type": "application/problem+json" } },
      ),
    );

    const result = await startAnalysis("world-cup-winner");
    expect(result).toEqual({
      ok: false,
      kind: "wall",
      detail: "You've used all 5 analyses for this month. Upgrade to Pro ($19/month)...",
    });
  });

  it("classifies a 403 for an uninvited account as the wall too — same slug, different message", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/quota-exceeded",
          title: "Quota exceeded",
          status: 403,
          detail: "VegaIntel is invite-only during the private alpha. Your account is on the waitlist.",
        }),
        { status: 403 },
      ),
    );

    const result = await startAnalysis("world-cup-winner");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("wall");
      expect(result.detail).toContain("invite-only");
    }
  });

  it("falls back to the generic error copy for other failures", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/rate-limited",
          title: "Rate limit exceeded",
          status: 429,
          detail: "Too many analyses. Try again in 30 seconds.",
        }),
        { status: 429 },
      ),
    );

    const result = await startAnalysis("world-cup-winner");
    expect(result).toEqual({
      ok: false,
      kind: "error",
      detail: "Too many requests. Wait a moment before trying again.",
    });
  });

  it("reports a calm error when the network call itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));

    const result = await startAnalysis("world-cup-winner");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("error");
      expect(result.detail).toContain("Couldn't reach");
    }
  });
});
