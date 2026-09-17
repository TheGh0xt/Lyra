import { describe, expect, it } from "vitest";
import type { MeResponse } from "@/lib/api/client";
import { deriveWallState } from "../wallState";

const base: MeResponse = {
  id: "u1",
  email: "a@example.com",
  display_name: null,
  interests: [],
  is_grandfathered: false,
  is_invited: true,
  onboarding_completed: true,
  usage: { analyses_this_month: 0, free_monthly_allowance: 5, enforced: true },
};

describe("deriveWallState", () => {
  it("is not-invited when the account hasn't been invited, regardless of usage", () => {
    expect(deriveWallState({ ...base, is_invited: false })).toBe("not-invited");
  });

  it("is ok when the quota isn't enforced (grandfathered), even at or past the count", () => {
    expect(
      deriveWallState({
        ...base,
        usage: { analyses_this_month: 99, free_monthly_allowance: 5, enforced: false },
      }),
    ).toBe("ok");
  });

  it("is limit-reached once usage meets the allowance", () => {
    expect(
      deriveWallState({ ...base, usage: { ...base.usage, analyses_this_month: 5 } }),
    ).toBe("limit-reached");
  });

  it("is limit-reached, not something worse, if usage somehow exceeds the allowance", () => {
    expect(
      deriveWallState({ ...base, usage: { ...base.usage, analyses_this_month: 6 } }),
    ).toBe("limit-reached");
  });

  it("is approaching with exactly one analysis left", () => {
    expect(
      deriveWallState({ ...base, usage: { ...base.usage, analyses_this_month: 4 } }),
    ).toBe("approaching");
  });

  it("is ok with two or more analyses left", () => {
    expect(
      deriveWallState({ ...base, usage: { ...base.usage, analyses_this_month: 3 } }),
    ).toBe("ok");
  });

  it("prefers not-invited over limit-reached when somehow both are true", () => {
    expect(
      deriveWallState({
        ...base,
        is_invited: false,
        usage: { ...base.usage, analyses_this_month: 5 },
      }),
    ).toBe("not-invited");
  });
});
