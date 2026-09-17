// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import FeedPage from "../page";

const ME = {
  id: "u1",
  email: "a@example.com",
  display_name: null,
  interests: ["crypto"],
  is_grandfathered: false,
  is_invited: true,
  onboarding_completed: true,
  usage: { analyses_this_month: 3, free_monthly_allowance: 5, enforced: true },
};

const MARKET = {
  slug: "eth-2400-aug",
  question: "Will Ethereum reach $2,400 in August 2026?",
  source: "POLYMARKET",
  probability: 0.63,
  change_24h: 0.22,
  volume_24h: 1_840_000,
  category: "Crypto",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  push.mockClear();
  window.localStorage.clear();
});

function stubFetch(routes: Record<string, Response | (() => Response)>) {
  const entries = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const match = entries.find(([path]) => url.includes(path));
      if (!match) throw new Error(`unexpected fetch: ${init?.method ?? "GET"} ${url}`);
      const response = match[1];
      return typeof response === "function" ? response() : response;
    }),
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("FeedPage", () => {
  it("renders the markets it's given, with the usage indicator when enforced", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
    });
    render(<FeedPage />);

    expect(await screen.findByText(MARKET.question)).toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();
    expect(screen.getByText("3 / 5 analyses this month")).toBeInTheDocument();
  });

  it("hides the usage indicator when the quota isn't enforced (grandfathered)", async () => {
    stubFetch({
      "/api/me": json({ ...ME, usage: { ...ME.usage, enforced: false } }),
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
    });
    render(<FeedPage />);

    await screen.findByText(MARKET.question);
    expect(screen.queryByText(/analyses this month/)).not.toBeInTheDocument();
  });

  it("shows the honest quiet-feed state, not an empty screen, for a new user", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [], categories: ["crypto"] }),
    });
    render(<FeedPage />);

    expect(await screen.findByText("Your feed starts tomorrow")).toBeInTheDocument();
  });

  it("shows the service-unreachable state on a 503, not a crash", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json(
        {
          type: "https://pmie.dev/problems/sagittarius-unavailable",
          title: "Market data service unavailable",
          status: 503,
          detail: "unreachable",
        },
        503,
      ),
    });
    render(<FeedPage />);

    expect(await screen.findByText("Market data service unreachable")).toBeInTheDocument();
  });

  it("starts a run from a market card and navigates to it, remembering it as recent", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json({ analysis_id: "a1", stream_url: "x", status: "running" }, 201),
      "/api/events": new Response(null, { status: 204 }),
    });
    render(<FeedPage />);
    await screen.findByText(MARKET.question);

    // Two buttons share this label by design (the URL form's submit and the
    // card's own) — the card's is the last one in DOM order.
    const explainButtons = screen.getAllByRole("button", { name: "Explain this move" });
    await userEvent.click(explainButtons[explainButtons.length - 1]);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyses/a1"));
    expect(window.localStorage.getItem("vegaintel:recent-analyses")).toContain("a1");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/events",
        expect.objectContaining({
          body: JSON.stringify({ name: "analysis_started", ui_mode: "CONVENTIONAL" }),
        }),
      ),
    );
  });

  it("switching to terminal mode records the switch and navigates there", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [], categories: [] }),
      "/api/events": new Response(null, { status: 204 }),
    });
    render(<FeedPage />);
    await screen.findByRole("button", { name: "Switch to Terminal →" });

    await userEvent.click(screen.getByRole("button", { name: "Switch to Terminal →" }));

    expect(push).toHaveBeenCalledWith("/terminal");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/events",
        expect.objectContaining({
          body: JSON.stringify({ name: "ui_mode_switched", ui_mode: "TERMINAL" }),
        }),
      ),
    );
  });

  it("starts a run from the URL input", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [], categories: [] }),
      "/api/analyses": json({ analysis_id: "a2", stream_url: "x", status: "running" }, 201),
    });
    render(<FeedPage />);

    await userEvent.type(
      screen.getByLabelText("Analyse any market by URL"),
      "https://polymarket.com/event/x",
    );
    await userEvent.click(screen.getByRole("button", { name: "Explain this move" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyses/a2"));
  });

  it("shows the wall's own message on a 403, without navigating", async () => {
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [MARKET], categories: ["crypto"] }),
      "/api/analyses": json(
        {
          type: "https://pmie.dev/problems/quota-exceeded",
          title: "Quota exceeded",
          status: 403,
          detail: "You've used all 5 analyses for this month.",
        },
        403,
      ),
    });
    render(<FeedPage />);
    await screen.findByText(MARKET.question);

    const explainButtons = screen.getAllByRole("button", { name: "Explain this move" });
    await userEvent.click(explainButtons[explainButtons.length - 1]);

    expect(
      await screen.findByText("You've used all 5 analyses for this month."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "View usage & plans" })).toHaveAttribute(
      "href",
      "/usage",
    );
  });

  it("lists a recent analysis from localStorage and can reopen it", async () => {
    window.localStorage.setItem(
      "vegaintel:recent-analyses",
      JSON.stringify([{ id: "old1", question: "An old question?", when: "2026-09-01T00:00:00Z" }]),
    );
    stubFetch({
      "/api/me": json(ME),
      "/api/markets/moving": json({ markets: [], categories: [] }),
    });
    render(<FeedPage />);

    await userEvent.click(await screen.findByRole("button", { name: /An old question/ }));
    expect(push).toHaveBeenCalledWith("/analyses/old1");
  });
});
