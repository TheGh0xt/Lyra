// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Badge } from "../badge";
import { ConfidenceMeter } from "../confidence-meter";
import { Input } from "../input";
import { StageIndicator, StageList } from "../stage-indicator";
import { EvidenceBlock } from "../evidence-block";
import { StatePanel } from "../state-panel";
import { Disclaimer } from "../disclaimer";
import {
  CLAIM_VERIFICATION,
  CONFIDENCE_CEILING,
  IMPACT,
  SOURCE_TIER,
} from "@/lib/ui/contract-display";

describe("Badge", () => {
  it("prints the label, so the colour is never the only signal", () => {
    render(<Badge display={IMPACT.HIGH} />);
    expect(screen.getByText("High impact")).toBeInTheDocument();
  });

  it("hides the glyph from assistive tech, which already has the label", () => {
    const { container } = render(<Badge display={CLAIM_VERIFICATION.CONTRADICTS} />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe("✕");
    expect(screen.getByText("Contradicts")).toBeInTheDocument();
  });

  it("keeps the label readable when visually hidden", () => {
    render(<Badge display={SOURCE_TIER.WEAK} labelHidden />);
    // sr-only, not display:none — the word is still in the accessibility tree.
    expect(screen.getByText("Weak")).toHaveClass("sr-only");
  });
});

describe("ConfidenceMeter", () => {
  it("exposes the score as a meter with the cap in its label", () => {
    render(<ConfidenceMeter score={0.78} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "78");
    expect(meter.getAttribute("aria-label")).toContain("90 percent");
  });

  it("states the level in words beside the number", () => {
    render(<ConfidenceMeter score={0.5} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("draws the ceiling tick at the cap, not at the score", () => {
    const { container } = render(<ConfidenceMeter score={0.4} />);
    const tick = container.querySelector('[aria-hidden="true"][style*="left"]') as HTMLElement;
    expect(tick.style.left).toBe(`${CONFIDENCE_CEILING * 100}%`);
  });

  it("clamps a score outside the schema's 0–1 range", () => {
    render(<ConfidenceMeter score={1.4} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("StageIndicator", () => {
  it("announces the status as text, not only as a coloured dot", () => {
    render(<StageIndicator label="Detecting signals" state="active" />);
    expect(screen.getByText("— Active")).toBeInTheDocument();
  });

  it.each(["pending", "active", "done", "failed"] as const)(
    "renders %s without losing the stage name",
    (state) => {
      render(<StageIndicator label="Gathering news" state={state} />);
      expect(screen.getByText(/Gathering news/)).toBeInTheDocument();
    },
  );

  it("puts the strip in a polite live region so changes are announced", () => {
    render(
      <StageList>
        <StageIndicator label="Reasoning" state="pending" />
      </StageList>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});

describe("Input", () => {
  it("wires the error to the control for screen readers", () => {
    render(<Input label="Email" error="That address is missing an @" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("missing an @");
  });

  it("drops the hint when an error replaces it", () => {
    render(<Input label="Email" hint="We only use this to sign you in" error="Required" />);
    expect(screen.queryByText("We only use this to sign you in")).not.toBeInTheDocument();
  });

  it("is not marked invalid without an error", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });
});

describe("EvidenceBlock", () => {
  it("renders a citation's tier and verdict together", () => {
    render(
      <EvidenceBlock
        title="ETH ETF inflows hit a record"
        badge={SOURCE_TIER.PRIMARY}
        secondaryBadge={CLAIM_VERIFICATION.SUPPORTS}
        kind="Reuters"
        body="Net inflows of $412m on 14 August."
        provenance="Reuters · 14 Aug 2026 10:40 UTC"
      />,
    );
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Supports")).toBeInTheDocument();
  });

  it("opens external citations safely", () => {
    render(
      <EvidenceBlock title="Filing" body="…" href="https://example.com/filing" />,
    );
    const link = screen.getByRole("link", { name: "Filing" });
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("StatePanel", () => {
  it("gives every state a tag, a sentence and a way forward", () => {
    render(
      <StatePanel
        tag={IMPACT.LOW}
        title="No market at that URL"
        body="That link resolves to an event page with 6 markets."
        action={{ label: "Choose a market" }}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a market" })).toBeInTheDocument();
  });
});

describe("Disclaimer", () => {
  it("never claims to predict, in either variant", () => {
    const { rerender } = render(<Disclaimer />);
    expect(screen.getByRole("note")).toHaveTextContent(/not a prediction/i);
    rerender(<Disclaimer variant="bar" />);
    expect(screen.getByRole("note")).toHaveTextContent(/not a prediction/i);
  });
});
