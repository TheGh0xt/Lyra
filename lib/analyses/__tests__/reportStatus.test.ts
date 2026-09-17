import { describe, expect, it } from "vitest";
import type { AnalysisResult, MarketAnalysisReport } from "@/lib/api/client";
import { classifyRunFailure, deriveViewState, isHonestNonResult } from "../reportStatus";

const report: MarketAnalysisReport = {
  market_id: "0x1",
  timestamp: "2026-08-14T11:05:00Z",
  summary: "x",
  primary_causal_driver: "WHALE_ACTIVITY",
  confidence_score: 0.7,
  key_drivers: [{ type: "Order flow", impact: "HIGH", evidence_summary: "x" }],
  cited_sources: [],
  source: "POLYMARKET",
};

describe("deriveViewState", () => {
  it("is running when neither report nor error is present yet", () => {
    const result: AnalysisResult = { analysis_id: "a1", status: "running" };
    expect(deriveViewState(result)).toEqual({ kind: "running" });
  });

  it("is report once the report arrives", () => {
    const result: AnalysisResult = { analysis_id: "a1", status: "completed", report };
    expect(deriveViewState(result)).toEqual({ kind: "report", report });
  });

  it("is failed once an error arrives, even if status still says something else", () => {
    const result: AnalysisResult = { analysis_id: "a1", status: "failed", error: "boom" };
    expect(deriveViewState(result)).toEqual({ kind: "failed", detail: "boom" });
  });

  it("prefers the report over an error if a backend somehow sets both", () => {
    const result: AnalysisResult = { analysis_id: "a1", status: "completed", report, error: "boom" };
    expect(deriveViewState(result)).toEqual({ kind: "report", report });
  });
});

describe("isHonestNonResult", () => {
  it("is false for a normal, explained report", () => {
    expect(isHonestNonResult(report)).toBe(false);
  });

  it("is true only when the driver is unknown AND there are no drivers cited", () => {
    expect(
      isHonestNonResult({ ...report, primary_causal_driver: "UNKNOWN_ANOMALY", key_drivers: [] }),
    ).toBe(true);
  });

  it("is false for an unknown-anomaly report that still cites drivers", () => {
    expect(isHonestNonResult({ ...report, primary_causal_driver: "UNKNOWN_ANOMALY" })).toBe(false);
  });
});

describe("classifyRunFailure", () => {
  it("recognises the market-data-service-unreachable wording", () => {
    expect(classifyRunFailure("could not reach Sagittarius")).toBe("serviceUnreachable");
  });

  it("recognises the event-not-found wording", () => {
    expect(classifyRunFailure("No Polymarket event matched that slug")).toBe("notFound");
  });

  it("falls back to a generic model error for anything else", () => {
    expect(classifyRunFailure("the model refused to respond")).toBe("modelError");
  });
});
