import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "@/lib/api/client";
import { fetchNextRoute, routeForMe } from "../nextRoute";

const baseMe: MeResponse = {
  id: "u1",
  email: "a@example.com",
  display_name: null,
  interests: [],
  is_grandfathered: false,
  is_invited: false,
  onboarding_completed: false,
  usage: { analyses_this_month: 0, free_monthly_allowance: 5, enforced: true },
};

describe("routeForMe", () => {
  it("sends a user with no profile yet to onboarding", () => {
    expect(routeForMe(null)).toBe("/onboarding");
  });

  it("sends a user who hasn't finished onboarding to onboarding", () => {
    expect(routeForMe({ ...baseMe, onboarding_completed: false })).toBe("/onboarding");
  });

  it("sends a fully onboarded user home", () => {
    expect(routeForMe({ ...baseMe, onboarding_completed: true })).toBe("/feed");
  });
});

describe("fetchNextRoute", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("routes by the fetched profile on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...baseMe, onboarding_completed: true }), { status: 200 }),
    );
    expect(await fetchNextRoute()).toBe("/feed");
  });

  it("falls back to onboarding when /api/me fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    expect(await fetchNextRoute()).toBe("/onboarding");
  });

  it("falls back to onboarding when the network call throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchNextRoute()).toBe("/onboarding");
  });
});
