// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const consumeStream = vi.fn();
vi.mock("@/lib/api/sse", () => ({ consumeStream: (...args: unknown[]) => consumeStream(...args) }));

import TerminalPage from "../page";

const MARKET = {
  slug: "eth-2400-aug",
  question: "Will Ethereum reach $2,400 in August 2026?",
  source: "POLYMARKET",
  probability: 0.63,
  change_24h: 0.22,
  volume_24h: 1_840_000,
  category: "Crypto",
};

const REPORT = {
  market_id: "0x8f2a",
  timestamp: "2026-08-14T11:12:00Z",
  summary: "Three wallets bought YES for a combined $214k in 85 minutes.",
  primary_causal_driver: "WHALE_ACTIVITY",
  confidence_score: 0.78,
  source: "POLYMARKET",
  key_drivers: [
    { type: "Order flow", impact: "HIGH", evidence_summary: "Three wallets bought YES." },
  ],
  cited_sources: [
    {
      title: "Spain crowned champions",
      publisher: "Reuters",
      url: null,
      published_at: null,
      tier: "PRIMARY",
      verification: "SUPPORTS",
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

function stubFetch(routes: Record<string, Response | (() => Response)>) {
  const entries = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const match = entries.find(([path]) => url.includes(path));
      if (!match) throw new Error(`unexpected fetch: ${init?.method ?? "GET"} ${url}`);
      const response = match[1];
      return typeof response === "function" ? response() : response;
    }),
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("TerminalPage", () => {
  it("shows the real feed with no EDGE or SIGNAL column — those imply outcome forecasting", async () => {
    stubFetch({ "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }) });
    render(<TerminalPage />);

    expect(await screen.findByText(MARKET.question)).toBeInTheDocument();
    expect(screen.queryByText("EDGE")).not.toBeInTheDocument();
    expect(screen.queryByText("SIGNAL")).not.toBeInTheDocument();
    // Never a Kalshi ticker — Kalshi isn't live (B.5 deferred).
    expect(screen.queryByText(/KALSHI:/)).not.toBeInTheDocument();
  });

  it("launches a run from the feed, shows the real 4 stages while running, then the report", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
    });
    let deliverReport!: () => void;
    consumeStream.mockImplementation(
      (_url: string, onFrame: (f: unknown) => void) =>
        new Promise<void>((resolve) => {
          onFrame({ event: "stage_started", stage: "event_retrieval", data: null });
          onFrame({ event: "stage_completed", stage: "event_retrieval", data: null });
          deliverReport = () => {
            onFrame({ event: "report", stage: null, data: REPORT });
            resolve();
          };
        }),
    );

    render(<TerminalPage />);
    await userEvent.click(await screen.findByText(MARKET.question));

    // Held mid-run (consumeStream's promise is still pending) so the
    // 4-stage screen is observable before the report frame arrives.
    expect(await screen.findByText("INGEST")).toBeInTheDocument();
    expect(screen.getByText("SIGNALS")).toBeInTheDocument();
    expect(screen.getByText("SOURCES")).toBeInTheDocument();
    expect(screen.getByText("COMPOSE")).toBeInTheDocument();

    deliverReport();
    await waitFor(() => expect(screen.getByText("Whale activity", { exact: false })).toBeTruthy());
  });

  it("records analysis_started tagged with the terminal mode when launching a run", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
      "/api/events": new Response(null, { status: 204 }),
    });
    consumeStream.mockImplementation(async () => {});

    render(<TerminalPage />);
    await userEvent.click(await screen.findByText(MARKET.question));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/events",
        expect.objectContaining({
          body: JSON.stringify({ name: "analysis_started", ui_mode: "TERMINAL" }),
        }),
      ),
    );
  });

  it("exiting to conventional mode records the switch", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/events": new Response(null, { status: 204 }),
    });

    render(<TerminalPage />);
    await screen.findByText(MARKET.question);

    await userEvent.click(screen.getByRole("link", { name: "EXIT TO CONVENTIONAL" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/events",
        expect.objectContaining({
          body: JSON.stringify({ name: "ui_mode_switched", ui_mode: "CONVENTIONAL" }),
        }),
      ),
    );
  });

  it("report screen never shows a modelled probability or an edge stat", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
    });
    consumeStream.mockImplementation(async (_url: string, onFrame: (f: unknown) => void) => {
      onFrame({ event: "report", stage: null, data: REPORT });
    });

    render(<TerminalPage />);
    await userEvent.click(await screen.findByText(MARKET.question));

    expect(await screen.findByText(/PRIMARY CAUSE/)).toBeInTheDocument();
    expect(screen.queryByText("MODEL P(YES)")).not.toBeInTheDocument();
    expect(screen.queryByText("EDGE")).not.toBeInTheDocument();
    expect(screen.queryByText(/brier/i)).not.toBeInTheDocument();
    // Source tier and claim verification are shown, both printed as text.
    expect(screen.getByText("[PRIMARY]")).toBeInTheDocument();
    expect(screen.getByText("[SUPPORTS]")).toBeInTheDocument();
  });

  it("shows a run failure panel on a terminal error frame, without navigating away", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
    });
    consumeStream.mockImplementation(async (_url: string, onFrame: (f: unknown) => void) => {
      onFrame({ event: "error", stage: null, data: { detail: "could not reach Sagittarius" } });
    });

    render(<TerminalPage />);
    await userEvent.click(await screen.findByText(MARKET.question));

    expect(await screen.findByText("could not reach Sagittarius")).toBeInTheDocument();
  });

  it("shows 'connection lost' rather than a failure when the stream itself drops", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
      "/api/analyses/a1": json({ analysis_id: "a1", status: "running" }),
    });
    consumeStream.mockRejectedValue(new Error("network changed"));

    render(<TerminalPage />);
    await userEvent.click(await screen.findByText(MARKET.question));

    expect(await screen.findByText("! CONNECTION LOST")).toBeInTheDocument();
    expect(screen.queryByText("! RUN FAILED")).not.toBeInTheDocument();
  });

  it("[c] check status re-reads and shows the report, without ever POSTing a new analysis", async () => {
    let checkCount = 0;
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
      "/api/analyses/a1": () => {
        checkCount += 1;
        // First read (right after launch): still running, then the stream
        // drops. Second read (after "check status"): really finished.
        return checkCount === 1
          ? json({ analysis_id: "a1", status: "running" })
          : json({ analysis_id: "a1", status: "completed", report: REPORT });
      },
    });
    consumeStream.mockRejectedValue(new Error("network changed"));

    render(<TerminalPage />);
    await userEvent.click(await screen.findByText(MARKET.question));
    await screen.findByText("! CONNECTION LOST");

    await userEvent.keyboard("c");

    expect(await screen.findByText(/PRIMARY CAUSE/)).toBeInTheDocument();
  });

  it("opens the command palette with cmd+K and launches the top filtered result", async () => {
    stubFetch({
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a2", stream_url: "x", status: "running" }, 201),
    });
    consumeStream.mockImplementation(async () => {});

    render(<TerminalPage />);
    await screen.findByText(MARKET.question);

    await userEvent.keyboard("{Meta>}k{/Meta}");
    const input = await screen.findByLabelText("Market lookup or command");
    await userEvent.type(input, "ethereum");
    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /RUN/ })).toBeInTheDocument(),
    );
  });

  it("keyboard 1/2/3 switches screens, and 3 is a no-op until a report exists", async () => {
    stubFetch({ "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }) });

    render(<TerminalPage />);
    await screen.findByText(MARKET.question);

    await userEvent.keyboard("3");
    expect(screen.getByText(MARKET.question)).toBeInTheDocument();

    await userEvent.keyboard("2");
    expect(screen.getByText("STAGE PROGRESS")).toBeInTheDocument();

    await userEvent.keyboard("1");
    expect(await screen.findByText(MARKET.question)).toBeInTheDocument();
  });
});
