import { describe, expect, it } from "vitest";

import { drainFrames, parseFrame } from "../sse";
import { stageStatuses } from "../stages";

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
