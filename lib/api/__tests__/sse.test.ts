import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeStream, drainFrames, parseFrame, SseStreamError } from "../sse";
import { stageStatuses } from "../stages";
import type { Frame } from "../sse";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

/** Awaits a rejection and hands back the typed error, or fails loudly. */
async function rejection(promise: Promise<unknown>): Promise<SseStreamError> {
  try {
    await promise;
  } catch (caught) {
    return caught as SseStreamError;
  }
  throw new Error("expected the stream to reject, but it resolved");
}

const STAGE_FRAME =
  'event: stage_started\ndata: {"stage": "event_retrieval", "data": {}}\n\n';
const REPORT_FRAME = 'event: report\ndata: {"stage": null, "data": {"market_id": "0xabc"}}\n\n';
const ERROR_FRAME =
  'event: error\ndata: {"stage": null, "data": {"detail": "the model gave up"}}\n\n';

describe("parseFrame", () => {
  it("parses a stage event", () => {
    const frame = parseFrame(
      'event: stage_started\ndata: {"stage": "event_retrieval", "data": {}}',
    );
    expect(frame).toEqual({
      event: "stage_started",
      stage: "event_retrieval",
      data: {},
    });
  });

  it("parses a report event with a null stage", () => {
    const frame = parseFrame(
      'event: report\ndata: {"stage": null, "data": {"market_id": "0xabc"}}',
    );
    expect(frame?.event).toBe("report");
    expect(frame?.stage).toBeNull();
    expect(frame?.data).toEqual({ market_id: "0xabc" });
  });

  it("returns null rather than throwing on malformed JSON", () => {
    // One bad frame must not tear down a stream still delivering good ones.
    expect(parseFrame("event: report\ndata: {not json")).toBeNull();
  });

  it("returns null when a field is missing", () => {
    expect(parseFrame("data: {}")).toBeNull();
    expect(parseFrame("event: report")).toBeNull();
  });
});

describe("drainFrames", () => {
  it("splits complete frames and keeps the partial remainder", () => {
    // This is the case naive SSE readers get wrong: a network chunk can end
    // mid-frame, and parsing the partial text would drop the event entirely.
    const buffer =
      'event: stage_started\ndata: {"stage": "analysis", "data": {}}\n\n' +
      'event: report\ndata: {"stage": nul';

    const { frames, rest } = drainFrames(buffer);

    expect(frames).toHaveLength(1);
    expect(frames[0].stage).toBe("analysis");
    expect(rest).toBe('event: report\ndata: {"stage": nul');
  });

  it("carries a remainder across reads without losing the event", () => {
    const first = drainFrames('event: report\ndata: {"stage": nul');
    expect(first.frames).toHaveLength(0);

    const second = drainFrames(first.rest + 'l, "data": {"ok": true}}\n\n');
    expect(second.frames).toHaveLength(1);
    expect(second.frames[0].data).toEqual({ ok: true });
    expect(second.rest).toBe("");
  });

  it("handles several frames arriving in one chunk", () => {
    const buffer =
      'event: stage_started\ndata: {"stage": "event_retrieval", "data": {}}\n\n' +
      'event: stage_completed\ndata: {"stage": "event_retrieval", "data": {}}\n\n';
    expect(drainFrames(buffer).frames).toHaveLength(2);
  });
});

describe("consumeStream", () => {
  // LYR-02. Every test here is a case where the old implementation resolved
  // normally, so the caller's `catch` never ran, `disconnected` stayed false,
  // and the run screen showed four grey stages forever.

  it("throws on a non-2xx instead of resolving as if the run were still going", async () => {
    // The exact beta-blocking scenario: a token expires mid-run. A 401 still
    // has a body, so the old reader decoded problem+json as SSE text, found
    // no `\n\n`, emitted zero frames, hit `done` and resolved.
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "token expired",
        }),
        { status: 401, headers: { "content-type": "application/problem+json" } },
      ),
    );
    const onFrame = vi.fn();

    await expect(consumeStream("/api/analyses/a1/events", onFrame)).rejects.toThrow(
      SseStreamError,
    );
    expect(onFrame).not.toHaveBeenCalled();
  });

  it("carries the upstream status and problem copy on the error", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/sagittarius-unavailable",
          title: "Upstream unavailable",
          status: 503,
          detail: "sagittarius timed out",
        }),
        { status: 503, headers: { "content-type": "application/problem+json" } },
      ),
    );

    const error = await rejection(consumeStream("/api/analyses/a1/events", vi.fn()));

    expect(error).toBeInstanceOf(SseStreamError);
    expect(error.status).toBe(503);
    // Routed through the shared PROBLEM_COPY table rather than echoing the
    // raw server detail, so the wording matches every other failure path.
    expect(error.message).toMatch(/market data service is unreachable/i);
  });

  it("falls back to the status when the body is not problem+json", async () => {
    // This is the LYR-03 compound case: an unhandled throw in the proxy
    // returns Next's HTML 500 page, which has no `detail` to quote.
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("<!DOCTYPE html><title>500</title>", { status: 500 }),
      );

    const error = await rejection(consumeStream("/api/analyses/a1/events", vi.fn()));

    expect(error).toBeInstanceOf(SseStreamError);
    expect(error.status).toBe(500);
    expect(error.message).toMatch(/500/);
  });

  it("throws when the stream ends before any terminal frame", async () => {
    // Cygnus always publishes `report` or `error` before closing (see
    // pipeline.py's finally: registry.close). So a stream that ends after
    // only stage events was cut in transit — a 15s function timeout, a
    // dropped connection, a restart — and is never a completed run.
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(streamOf(STAGE_FRAME), { status: 200 }));
    const onFrame = vi.fn();

    await expect(consumeStream("/api/analyses/a1/events", onFrame)).rejects.toThrow(
      SseStreamError,
    );
    // The frames it did see are still delivered — progress already shown on
    // screen must not be rolled back by the failure.
    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it("throws when the body is empty", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(streamOf(), { status: 200 }));

    await expect(consumeStream("/api/analyses/a1/events", vi.fn())).rejects.toThrow(
      SseStreamError,
    );
  });

  it("resolves once a report frame has arrived", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(streamOf(STAGE_FRAME, REPORT_FRAME), { status: 200 }),
      );
    const frames: Frame[] = [];

    await expect(
      consumeStream("/api/analyses/a1/events", (frame) => frames.push(frame)),
    ).resolves.toBeUndefined();
    expect(frames.map((f) => f.event)).toEqual(["stage_started", "report"]);
  });

  it("resolves on an error frame — a reported failure is a finished run, not a broken stream", async () => {
    // The distinction ProgressView draws: `failure` (Cygnus said it failed,
    // offer Retry) versus `disconnected` (the pipe broke, offer Check status).
    // Throwing here would misfile a genuine failure as a connection problem.
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(streamOf(ERROR_FRAME), { status: 200 }));
    const frames: Frame[] = [];

    await expect(
      consumeStream("/api/analyses/a1/events", (frame) => frames.push(frame)),
    ).resolves.toBeUndefined();
    expect(frames).toHaveLength(1);
    expect(frames[0].event).toBe("error");
  });

  it("reassembles a frame split across chunks", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          streamOf('event: report\ndata: {"stage": nul', 'l, "data": {"ok": true}}\n\n'),
          { status: 200 },
        ),
      );
    const frames: Frame[] = [];

    await consumeStream("/api/analyses/a1/events", (frame) => frames.push(frame));

    expect(frames).toHaveLength(1);
    expect(frames[0].data).toEqual({ ok: true });
  });

  it("still delivers a terminal frame that arrives without its trailing blank line", async () => {
    // A truncated tail would otherwise be dropped by drainFrames and then
    // reported as a premature end — turning a report that did arrive into
    // "connection lost".
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          streamOf('event: report\ndata: {"stage": null, "data": {"ok": true}}'),
          { status: 200 },
        ),
      );
    const frames: Frame[] = [];

    await expect(
      consumeStream("/api/analyses/a1/events", (frame) => frames.push(frame)),
    ).resolves.toBeUndefined();
    expect(frames).toHaveLength(1);
  });

  it("requests the SSE content type", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(streamOf(REPORT_FRAME), { status: 200 }));

    await consumeStream("/api/analyses/a1/events", vi.fn());

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/analyses/a1/events",
      expect.objectContaining({ headers: { accept: "text/event-stream" } }),
    );
  });
});

describe("stageStatuses", () => {
  it("starts every stage pending", () => {
    expect(stageStatuses([])).toEqual({
      event_retrieval: "pending",
      signal_retrieval: "pending",
      news_retrieval: "pending",
      analysis: "pending",
    });
  });

  it("marks a started stage active and a completed one done", () => {
    const statuses = stageStatuses([
      { event: "stage_started", stage: "event_retrieval" },
      { event: "stage_completed", stage: "event_retrieval" },
      { event: "stage_started", stage: "signal_retrieval" },
    ]);
    expect(statuses.event_retrieval).toBe("done");
    expect(statuses.signal_retrieval).toBe("active");
    expect(statuses.news_retrieval).toBe("pending");
  });

  it("ignores stages it does not recognise", () => {
    // Internal agent names must never leak into the UI's state machine.
    const statuses = stageStatuses([
      { event: "stage_started", stage: "polymarket_orchestrator" },
      { event: "stage_started", stage: null },
    ]);
    expect(Object.values(statuses).every((s) => s === "pending")).toBe(true);
  });

  it("does not regress a done stage back to active", () => {
    const statuses = stageStatuses([
      { event: "stage_started", stage: "analysis" },
      { event: "stage_completed", stage: "analysis" },
      { event: "stage_started", stage: "analysis" },
    ]);
    expect(statuses.analysis).toBe("done");
  });
});
