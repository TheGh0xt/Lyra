import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "@/lib/api/client";

const getAuthenticatorAssuranceLevel = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({ auth: { mfa: { getAuthenticatorAssuranceLevel } } }),
}));

import { fetchNextRoute, needsMfaStepUp, routeForMe } from "../nextRoute";

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

  it("sends a user who chose terminal mode to /terminal instead", () => {
    expect(routeForMe({ ...baseMe, onboarding_completed: true, ui_mode: "TERMINAL" })).toBe(
      "/terminal",
    );
  });

  it("treats a null ui_mode (never chosen) as conventional, not a third mode", () => {
    expect(routeForMe({ ...baseMe, onboarding_completed: true, ui_mode: null })).toBe("/feed");
  });

  it("sends someone to onboarding first even if they already chose terminal mode", () => {
    expect(routeForMe({ ...baseMe, onboarding_completed: false, ui_mode: "TERMINAL" })).toBe(
      "/onboarding",
    );
  });
});

describe("needsMfaStepUp", () => {
  it("is false when Supabase says no verified factor exists (nextLevel stays aal1)", () => {
    expect(needsMfaStepUp("aal1", "aal1")).toBe(false);
  });

  it("is false once the session is already aal2", () => {
    expect(needsMfaStepUp("aal2", "aal2")).toBe(false);
  });

  it("is true for a verified-factor account whose session hasn't stepped up yet", () => {
    expect(needsMfaStepUp("aal1", "aal2")).toBe(true);
  });

  it("is true for a signed-out/unknown session too, so a caller doesn't have to null-check first", () => {
    expect(needsMfaStepUp(null, "aal2")).toBe(true);
    expect(needsMfaStepUp(undefined, "aal2")).toBe(true);
  });
});

describe("fetchNextRoute", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal1" },
    });
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

  it("routes to the MFA step-up screen before ever calling /api/me, for an unstepped-up session (F12)", async () => {
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
    });
    global.fetch = vi.fn();

    expect(await fetchNextRoute()).toBe("/mfa");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
