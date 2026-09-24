// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Input } from "../ui/input";
import { MarketCard } from "../feed/MarketCard";
import { FeedScreen } from "../terminal/FeedScreen";
import { TerminalFooter } from "../terminal/TerminalChrome";
import type { MovingMarket } from "@/lib/api/client";

/**
 * UX-05 — the parts of "usable on a phone" that a unit test can actually
 * hold.
 *
 * jsdom has no layout engine, so none of this proves a screen *looks* right;
 * that was verified in a browser at 320px and 375px. What these tests pin is
 * the handful of decisions that look like typos to the next reader and would
 * be quietly "tidied" back into the bug:
 *
 *   - a 16px input font (reads like an inconsistency next to `text-sm`)
 *   - a responsive grid track (reads like leftover experiment)
 *   - a 44px minimum on a 16px-tall link (reads like a stray utility)
 *
 * Each one has a comment saying what breaks without it. A test that only
 * asserted "has class X" would be noise; these assert the class *and* say
 * why the class is load-bearing.
 */

const MARKET = {
  slug: "us-government-shutdown",
  question: "Will there be a US government shutdown before October 31?",
  probability: 0.62,
  change_24h: 0.12,
  volume_24h: 1_240_000,
  category: "Politics",
  source: "POLYMARKET",
} as unknown as MovingMarket;

describe("Input — iOS zoom", () => {
  it("renders at 16px on small screens and 14px from sm up", () => {
    // iOS Safari zooms the page when a focused input's text is under 16px
    // and does not zoom back out on blur. One tap on the sign-in field
    // would leave every later screen scaled and scrolling sideways, so the
    // mobile size must stay at or above 16px (`text-base`).
    const { container } = render(<Input placeholder="email" />);
    const input = container.querySelector("input");
    expect(input).toHaveClass("text-base");
    expect(input).toHaveClass("sm:text-sm");
    expect(input?.className).not.toMatch(/(^|\s)text-sm(\s|$)/);
  });
});

describe("FeedScreen — terminal watchlist", () => {
  it("keeps the four-column track behind the sm breakpoint", () => {
    // Unconditionally, `1.6fr 62px 74px 82px` gave the market question 80px
    // of a 375px row — a 56-character question became a six-line block and
    // the volume column clipped off the right edge.
    render(<FeedScreen markets={[MARKET]} loading={false} error={null} onSelect={() => {}} usage={null} />);
    const row = screen.getByRole("button", { name: /government shutdown/ });
    expect(row).toHaveClass("grid-cols-1");
    expect(row.className).toContain("sm:grid-cols-[1.6fr_62px_74px_82px]");

    // The column headings name tracks that only exist at sm and up, so they
    // must not render as a stray row of words on a phone.
    const heading = screen.getByText("MARKET").parentElement;
    expect(heading).toHaveClass("hidden");
    expect(heading?.className).toContain("sm:grid");
  });

  it("groups the figures so they can drop under the question", () => {
    // `sm:contents` is what lets one piece of markup serve both layouts: at
    // desktop widths the wrapper stops generating a box and its children
    // become grid items in the original tracks. Remove it and the three
    // figures collapse into a single column cell.
    render(<FeedScreen markets={[MARKET]} loading={false} error={null} onSelect={() => {}} usage={null} />);
    const figures = screen.getByText("62%").parentElement;
    expect(figures?.className).toContain("sm:contents");
  });
});

describe("TerminalFooter", () => {
  it("hides the keyboard shortcut strip below sm", () => {
    // A phone has no keyboard to press these with, and wrapped they took
    // five lines of a ~700px viewport. Every one has a tappable equivalent
    // in the header.
    render(<TerminalFooter />);
    const strip = screen.getByText("⌘K lookup").parentElement;
    expect(strip).toHaveClass("hidden");
    expect(strip?.className).toContain("sm:flex");
  });

  it("keeps the disclaimer visible at every width", () => {
    // The research-only notice is a trust element (UI_PRD §6.1.5), not
    // chrome — it must never be the thing that gets hidden to save space.
    render(<TerminalFooter />);
    expect(screen.getByText(/not financial\s+advice/)).toBeVisible();
  });
});

describe("MarketCard", () => {
  it("gives the primary action full width on a phone", () => {
    // "Explain this move" is the single most important tap in the product.
    // Beside a 220px question floor it ended up a stranded half-width
    // button; below sm the card is one column and the action spans it.
    render(<MarketCard market={MARKET} onExplain={() => {}} />);
    const button = screen.getByRole("button", { name: "Explain this move" });
    expect(button).toHaveClass("w-full");
    expect(button.className).toContain("sm:w-auto");
  });
});

describe("AuthedNav — touch targets", () => {
  it("gives every item a 44px hit area below sm", async () => {
    // Each item rendered as a 16px-tall target packed 20px apart — under the
    // 24px WCAG 2.5.8 floor. The dangerous neighbours are "Terminal mode"
    // and "Sign out": a mis-tap signs the tester out mid-session.
    vi.doMock("next/navigation", () => ({
      usePathname: () => "/feed",
      useRouter: () => ({ push: vi.fn() }),
    }));
    const { AuthedNav } = await import("../nav/AuthedNav");
    render(<AuthedNav />);

    for (const name of ["Feed", "Usage", "Sign out"]) {
      expect(screen.getByText(name)).toHaveClass("min-h-11");
    }
    // Text size is untouched — only the touchable box grows, and only below
    // sm, so the desktop bar is unchanged.
    expect(screen.getByText("Feed").className).toContain("sm:min-h-0");
  });
});

describe("TerminalHeader — merge seam between UX-05 and UX-06", () => {
  it("orders every item in the bar explicitly", async () => {
    // #62 (SECURITY) and #63 (mobile ordering) landed minutes apart, both
    // touching this bar, and git merged them without a conflict. An
    // un-ordered flex child defaults to `order: 0`, which sorts *before*
    // every `order-1..4` sibling — so SECURITY arrived on mobile ahead of
    // the logo. Nothing here may rely on the default: the next person to add
    // a control to this bar should get a failing test, not a silent
    // reshuffle on phones only.
    const { TerminalHeader } = await import("../terminal/TerminalChrome");
    const { container } = render(
      <TerminalHeader
        screen="feed"
        reportReady
        onNavigate={() => {}}
        onOpenPalette={() => {}}
        onExitToConventional={() => {}}
      />,
    );
    const bar = container.firstElementChild!;
    for (const child of Array.from(bar.children)) {
      expect(child.className).toMatch(/(^|\s)order-\d/);
      expect(child.className).toMatch(/(^|\s)sm:order-\d/);
    }
  });

  it("keeps SECURITY and EXIT on the same mobile row", async () => {
    // They share `order-2` deliberately: equal orders fall back to DOM
    // order, which already has SECURITY first. Bumping EXIT to `order-3`
    // tied it with the full-width tab group and sorted it *after* that row,
    // stranding EXIT alone on a fourth line — a 177px header on a phone.
    const { TerminalHeader } = await import("../terminal/TerminalChrome");
    render(
      <TerminalHeader
        screen="feed"
        reportReady
        onNavigate={() => {}}
        onOpenPalette={() => {}}
        onExitToConventional={() => {}}
      />,
    );
    const security = screen.getByRole("link", { name: "SECURITY" });
    const exit = screen.getByRole("link", { name: "EXIT TO CONVENTIONAL" });
    expect(security.className).toContain("order-2");
    expect(exit.className).toContain("order-2");
    // Both are security-adjacent chrome and get the same 44px touch target.
    expect(security.className).toContain("min-h-11");
    expect(exit.className).toContain("min-h-11");
  });
});

describe("TerminalHeader — the fourth tab (UX-01)", () => {
  it("hides the [n] shortcut prefix below sm but keeps it in the accessible name", async () => {
    // Adding HISTORY pushed the tab strip to 421px against a 360px
    // viewport — 61px of horizontal overflow, the exact defect UX-05 had
    // just removed. The `[n]` prefixes are keyboard affordances and a phone
    // has no keyboard (the same reasoning that hides the footer strip), so
    // dropping them visually buys ~120px and keeps all four tabs labelled.
    // The shortcut must still reach a screen reader, which may be on a
    // tablet with a keyboard attached.
    const { TerminalHeader } = await import("../terminal/TerminalChrome");
    render(
      <TerminalHeader
        screen="feed"
        reportReady
        onNavigate={() => {}}
        onOpenPalette={() => {}}
        onExitToConventional={() => {}}
      />,
    );

    for (const [n, label] of [[1, "FEED"], [2, "RUN"], [3, "REPORT"], [4, "HISTORY"]] as const) {
      const tab = screen.getByRole("button", { name: `[${n}] ${label}` });
      const prefix = tab.querySelector("span");
      expect(prefix).toHaveClass("hidden");
      expect(prefix?.className).toContain("sm:inline");
    }
  });

  it("never disables HISTORY, unlike REPORT", async () => {
    // The complaint was "it has only three functionality". A tab that
    // disables itself until you have already run something reproduces that
    // impression for exactly the user who is forming a first impression.
    const { TerminalHeader } = await import("../terminal/TerminalChrome");
    render(
      <TerminalHeader
        screen="feed"
        reportReady={false}
        onNavigate={() => {}}
        onOpenPalette={() => {}}
        onExitToConventional={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "[4] HISTORY" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "[3] REPORT" })).toBeDisabled();
  });
});
