// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsagePage from "../page";

const ME = {
  id: "u1",
  email: "a@example.com",
  display_name: null,
  interests: [],
  is_grandfathered: false,
  is_invited: true,
  onboarding_completed: true,
  usage: { analyses_this_month: 2, free_monthly_allowance: 5, enforced: true },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("UsagePage", () => {
  it("shows the usage bar with no wall well under the limit", async () => {
    stubFetch({ "/api/me": json(ME) });
    render(<UsagePage />);

    expect(await screen.findByText("2 / 5 analyses")).toBeInTheDocument();
    expect(screen.queryByText(/One analysis left/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Pro/)).not.toBeInTheDocument();
  });

  it("shows the approaching-limit notice with exactly one left", async () => {
    stubFetch({ "/api/me": json({ ...ME, usage: { ...ME.usage, analyses_this_month: 4 } }) });
    render(<UsagePage />);

    expect(await screen.findByText("One analysis left this month")).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Pro/)).not.toBeInTheDocument();
  });

  it("shows the invite-only wall with no pricing for an uninvited account, even over quota", async () => {
    stubFetch({
      "/api/me": json({ ...ME, is_invited: false, usage: { ...ME.usage, analyses_this_month: 5 } }),
    });
    render(<UsagePage />);

    expect(await screen.findByText("You're on the waitlist")).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Pro/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$19/)).not.toBeInTheDocument();
  });

  it("shows the paywall with the real price for a genuinely over-quota account, and records intent", async () => {
    stubFetch({
      "/api/me": json({ ...ME, usage: { ...ME.usage, analyses_this_month: 5 } }),
      "/api/billing/intent": new Response(null, { status: 204 }),
    });
    render(<UsagePage />);

    expect(await screen.findByText(/That was your 5th analysis/)).toBeInTheDocument();
    const upgrade = screen.getByRole("button", { name: "Upgrade to Pro — $19/mo" });

    await userEvent.click(upgrade);

    expect(await screen.findByText(/Noted — thanks/)).toBeInTheDocument();
  });

  it("hides the usage bar's binding language for a grandfathered account", async () => {
    stubFetch({
      "/api/me": json({ ...ME, usage: { analyses_this_month: 40, free_monthly_allowance: 5, enforced: false } }),
    });
    render(<UsagePage />);

    expect(await screen.findByText(/grandfathered/)).toBeInTheDocument();
    expect(screen.queryByText(/That was your/)).not.toBeInTheDocument();
  });

  it("shows a plain error state when /api/me fails, not a blank page", async () => {
    stubFetch({
      "/api/me": json(
        { type: "https://pmie.dev/problems/unauthorized", title: "x", status: 401, detail: "x" },
        401,
      ),
    });
    render(<UsagePage />);

    expect(await screen.findByText("Couldn't load usage")).toBeInTheDocument();
  });
});
