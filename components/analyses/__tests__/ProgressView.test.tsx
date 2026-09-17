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
        disconnected={false}
        onRetry={vi.fn()}
        onCheckStatus={vi.fn()}
        onBackToFeed={vi.fn()}
      />,
    );

    expect(screen.getByText("Retrieving market data")).toBeInTheDocument();
    expect(screen.getByText("Detecting signals")).toBeInTheDocument();
    expect(screen.getByText("Gathering news")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check status" })).not.toBeInTheDocument();
  });

  it("classifies a genuine failure and offers retry (a new run) / back to feed", async () => {
    const onRetry = vi.fn();
    const onBackToFeed = vi.fn();
    render(
      <ProgressView
        statuses={stageStatuses([{ event: "stage_started", stage: "event_retrieval" }])}
        failure="could not reach Sagittarius"
        disconnected={false}
        onRetry={onRetry}
        onCheckStatus={vi.fn()}
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

  it("offers 'check status', never 'retry', when the connection dropped rather than the run failing", async () => {
    const onRetry = vi.fn();
    const onCheckStatus = vi.fn();
    render(
      <ProgressView
        statuses={stageStatuses([{ event: "stage_started", stage: "event_retrieval" }])}
        failure={null}
        disconnected
        onRetry={onRetry}
        onCheckStatus={onCheckStatus}
        onBackToFeed={vi.fn()}
      />,
    );

    expect(screen.getByText("Lost connection to this run")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Check status" }));
    expect(onCheckStatus).toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("shows a busy label on the check-status button while checking", () => {
    render(
      <ProgressView
        statuses={stageStatuses([])}
        failure={null}
        disconnected
        checking
        onRetry={vi.fn()}
        onCheckStatus={vi.fn()}
        onBackToFeed={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Checking…" })).toBeInTheDocument();
  });
});
