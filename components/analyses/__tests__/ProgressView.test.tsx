// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressView } from "../ProgressView";
import { stageStatuses } from "@/lib/api/stages";

describe("ProgressView", () => {
  it("shows all four stages with their labels", () => {
    render(
      <ProgressView
        statuses={stageStatuses([])}
        failure={null}
        onRetry={vi.fn()}
        onBackToFeed={vi.fn()}
      />,
    );

    expect(screen.getByText("Retrieving market data")).toBeInTheDocument();
    expect(screen.getByText("Detecting signals")).toBeInTheDocument();
    expect(screen.getByText("Gathering news")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("classifies a service-unreachable failure and offers retry / back to feed", async () => {
    const onRetry = vi.fn();
    const onBackToFeed = vi.fn();
    render(
      <ProgressView
        statuses={stageStatuses([{ event: "stage_started", stage: "event_retrieval" }])}
        failure="could not reach Sagittarius"
        onRetry={onRetry}
        onBackToFeed={onBackToFeed}
      />,
    );

    expect(screen.getByText("This run didn't finish")).toBeInTheDocument();
    expect(screen.getByText("could not reach Sagittarius")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Back to feed" }));
    expect(onBackToFeed).toHaveBeenCalled();
  });
});
