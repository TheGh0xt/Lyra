// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const consumeStream = vi.fn();
vi.mock("@/lib/api/sse", () => ({ consumeStream: (...args: unknown[]) => consumeStream(...args) }));

import { AnalysisRun } from "@/components/analyses/AnalysisRun";

const REPORT = {
  market_id: "0x1",
  timestamp: "2026-08-14T11:12:00Z",
  summary: "x",
  primary_causal_driver: "WHALE_ACTIVITY",
  confidence_score: 0.7,
  source: "POLYMARKET",
  key_drivers: [],
  cited_sources: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  push.mockClear();
  replace.mockClear();
  window.sessionStorage.clear();
});

describe("AnalysisRun", () => {
  it("shows the report immediately when reopening an already-finished run, without touching SSE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ analysis_id: "a1", status: "completed", report: REPORT }), {
          status: 200,
        }),
      ),
    );

    render(<AnalysisRun id="a1" />);

    expect(await screen.findByText("Whale activity")).toBeInTheDocument();
    expect(consumeStream).not.toHaveBeenCalled();
  });

  it("subscribes to SSE and renders the report once the terminal report frame arrives", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ analysis_id: "a1", status: "running" }), { status: 200 }),
      ),
    );
    consumeStream.mockImplementation(async (_url: string, onFrame: (f: unknown) => void) => {
      onFrame({ event: "stage_started", stage: "event_retrieval", data: null });
      onFrame({ event: "stage_completed", stage: "event_retrieval", data: null });
      onFrame({ event: "report", stage: null, data: REPORT });
    });

    render(<AnalysisRun id="a1" />);

    expect(await screen.findByText("Whale activity")).toBeInTheDocument();
  });

  it("shows the failure panel on a terminal error frame", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ analysis_id: "a1", status: "running" }), { status: 200 }),
      ),
    );
    consumeStream.mockImplementation(async (_url: string, onFrame: (f: unknown) => void) => {
      onFrame({ event: "error", stage: null, data: { detail: "could not reach Sagittarius" } });
    });

    render(<AnalysisRun id="a1" />);

    expect(await screen.findByText("could not reach Sagittarius")).toBeInTheDocument();
  });

  it("retries with the remembered query and replaces the URL with the new analysis id", async () => {
    window.sessionStorage.setItem("vegaintel:query:a1", "world-cup-winner");
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/analyses/a1" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify({ analysis_id: "a1", status: "running" }), {
          status: 200,
        });
      }
      if (url === "/api/analyses" && init?.method === "POST") {
        return new Response(
          JSON.stringify({ analysis_id: "a2", stream_url: "x", status: "running" }),
          { status: 201 },
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    consumeStream.mockImplementation(async (_url: string, onFrame: (f: unknown) => void) => {
      onFrame({ event: "error", stage: null, data: { detail: "the model refused to respond" } });
    });

    render(<AnalysisRun id="a1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/analyses/a2"));
  });

  it("shows 'connection lost' rather than a failure when the stream itself drops", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ analysis_id: "a1", status: "running" }), { status: 200 }),
      ),
    );
    consumeStream.mockRejectedValue(new Error("network changed"));

    render(<AnalysisRun id="a1" />);

    expect(await screen.findByText("Lost connection to this run")).toBeInTheDocument();
    expect(screen.queryByText("This run didn't finish")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("'check status' re-reads and shows the report, without ever POSTing a new analysis", async () => {
    let checkCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/analyses/a1") {
        checkCount += 1;
        // First read (initial mount): still running, stream then drops.
        // Second read (after "Check status"): the run finished for real.
        return checkCount === 1
          ? new Response(JSON.stringify({ analysis_id: "a1", status: "running" }), { status: 200 })
          : new Response(
              JSON.stringify({ analysis_id: "a1", status: "completed", report: REPORT }),
              { status: 200 },
            );
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    consumeStream.mockRejectedValue(new Error("network changed"));

    render(<AnalysisRun id="a1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Check status" }));

    expect(await screen.findByText("Whale activity")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/analyses",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falls back to the feed when retry has nothing remembered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ analysis_id: "a1", status: "running" }), { status: 200 }),
      ),
    );
    consumeStream.mockImplementation(async (_url: string, onFrame: (f: unknown) => void) => {
      onFrame({ event: "error", stage: null, data: { detail: "boom" } });
    });

    render(<AnalysisRun id="a1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(push).toHaveBeenCalledWith("/feed");
  });
});
