// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SharePage from "../page";

const REPORT = {
  market_id: "0x1",
  timestamp: "2026-08-14T11:12:00Z",
  summary: "Three wallets bought YES for a combined $214k.",
  primary_causal_driver: "WHALE_ACTIVITY",
  confidence_score: 0.78,
  source: "POLYMARKET",
  key_drivers: [],
  cited_sources: [],
};

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.CYGNUS_API_URL = "http://cygnus.test";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function props(id: string, shareToken?: string) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(shareToken ? { share_token: shareToken } : {}),
  };
}

describe("SharePage", () => {
  it("renders the report with the shared banner, needing no session", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ analysis_id: "a1", status: "completed", report: REPORT }), {
        status: 200,
      }),
    );

    render(await SharePage(props("a1", "tkn_abc")));

    expect(screen.getByText(/Public read-only report/)).toBeInTheDocument();
    expect(screen.getByText("Whale activity")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://cygnus.test/v1/analyses/a1?share_token=tkn_abc",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("asks for a share token when none is in the URL, without calling Cygnus", async () => {
    global.fetch = vi.fn();

    render(await SharePage(props("a1")));

    expect(screen.getByText("No share link here")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows an honest not-found state for a revoked or wrong token", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/analysis-not-found",
          title: "Not found",
          status: 404,
          detail: "no such share link",
        }),
        { status: 404 },
      ),
    );

    render(await SharePage(props("a1", "expired")));

    expect(screen.getByText("This link doesn't work anymore")).toBeInTheDocument();
  });
});
