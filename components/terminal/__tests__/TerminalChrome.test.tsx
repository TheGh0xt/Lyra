// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { TerminalHeader } from "../TerminalChrome";

function renderHeader(overrides: Partial<Parameters<typeof TerminalHeader>[0]> = {}) {
  return render(
    <TerminalHeader
      screen="feed"
      reportReady={false}
      onNavigate={vi.fn()}
      onOpenPalette={vi.fn()}
      onExitToConventional={vi.fn()}
      {...overrides}
    />,
  );
}

describe("TerminalHeader", () => {
  it("offers the three screen tabs and an exit", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: /FEED/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RUN/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /REPORT/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "EXIT TO CONVENTIONAL" })).toBeInTheDocument();
  });

  // UX-06. Terminal mode reached three screens and nothing else — no route to
  // the MFA screen at all, so a terminal-mode user had to know to leave the
  // mode entirely before they could secure their account.
  it("links SECURITY to the MFA screen, so terminal mode can reach it too", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "SECURITY" })).toHaveAttribute("href", "/mfa");
  });

  it("keeps REPORT disabled until a report exists", () => {
    renderHeader({ reportReady: false });
    expect(screen.getByRole("button", { name: /REPORT/ })).toBeDisabled();
  });
});
