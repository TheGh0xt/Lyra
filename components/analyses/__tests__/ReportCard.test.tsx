// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportCard } from "../ReportCard";
import type { MarketAnalysisReport } from "@/lib/api/client";

const baseReport: MarketAnalysisReport = {
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
      url: "https://reuters.example/x",
      published_at: "2026-08-14T10:00:00Z",
      tier: "PRIMARY",
      verification: "SUPPORTS",
    },
  ],
};

describe("ReportCard", () => {
  it("renders every required field (UI_PRD §6.7)", () => {
    render(<ReportCard report={baseReport} />);

    expect(screen.getByText("Whale activity")).toBeInTheDocument();
    expect(screen.getByText(baseReport.summary)).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Order flow")).toBeInTheDocument();
    expect(screen.getByText("Three wallets bought YES.")).toBeInTheDocument();
    expect(screen.getByText("Spain crowned champions")).toBeInTheDocument();
    expect(screen.getByText(/0x8f2a/)).toBeInTheDocument();
    // The persistent, non-dismissible disclaimer.
    expect(screen.getByRole("note")).toHaveTextContent("Research only");
  });

  it("shows the honest empty state for a real, unexplained non-result — not an error", () => {
    render(
      <ReportCard
        report={{ ...baseReport, primary_causal_driver: "UNKNOWN_ANOMALY", key_drivers: [] }}
      />,
    );

    expect(screen.getByText("Nothing notable happened")).toBeInTheDocument();
    expect(screen.queryByText("Whale activity")).not.toBeInTheDocument();
    // The disclaimer and footer still render even for the non-result state.
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("still shows the normal report for an unexplained move that DOES cite drivers", () => {
    render(<ReportCard report={{ ...baseReport, primary_causal_driver: "UNKNOWN_ANOMALY" }} />);
    expect(screen.queryByText("Nothing notable happened")).not.toBeInTheDocument();
    expect(screen.getByText("Unknown anomaly")).toBeInTheDocument();
  });

  it("shows the empty state for historical parallel, not a blank section", () => {
    render(<ReportCard report={{ ...baseReport, historical_context_match: null }} />);
    expect(screen.getByText(/No comparable past move/)).toBeInTheDocument();
  });

  it("populates historical parallel when present", () => {
    render(
      <ReportCard
        report={{
          ...baseReport,
          historical_context_match: {
            previous_market_id: "0xabc",
            prior_explanation_accuracy: 0.82,
          },
        }}
      />,
    );
    expect(screen.getByText(/0xabc/)).toBeInTheDocument();
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });

  it("shows the no-news honest note when there are no cited sources", () => {
    render(<ReportCard report={{ ...baseReport, cited_sources: [] }} />);
    expect(
      screen.getByText("No coverage was found in the window that matters."),
    ).toBeInTheDocument();
  });

  it("shows the public share banner only when shared", () => {
    const { rerender } = render(<ReportCard report={baseReport} />);
    expect(screen.queryByText(/Public read-only report/)).not.toBeInTheDocument();

    rerender(<ReportCard report={baseReport} shared />);
    expect(screen.getByText(/Public read-only report/)).toBeInTheDocument();
  });
});
