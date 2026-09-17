import { describe, expect, it } from "vitest";
import { isProtectedPath } from "../protectedRoutes";

describe("isProtectedPath", () => {
  it("protects the feed and everything under it", () => {
    expect(isProtectedPath("/feed")).toBe(true);
    expect(isProtectedPath("/feed/starters")).toBe(true);
  });

  it("protects onboarding, mfa, usage and the analysis run/report pages", () => {
    expect(isProtectedPath("/onboarding")).toBe(true);
    expect(isProtectedPath("/mfa")).toBe(true);
    expect(isProtectedPath("/usage")).toBe(true);
    expect(isProtectedPath("/analyses/abc123")).toBe(true);
  });

  it("protects terminal mode", () => {
    expect(isProtectedPath("/terminal")).toBe(true);
  });

  it("never protects the public share view, even though it starts similarly", () => {
    expect(isProtectedPath("/share/abc123")).toBe(false);
  });

  it("leaves marketing, auth and legacy demo routes open", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
    expect(isProtectedPath("/verify-pending")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
    expect(isProtectedPath("/analyze")).toBe(false);
    expect(isProtectedPath("/design")).toBe(false);
  });

  it("doesn't false-positive on a route that merely starts with a protected name", () => {
    expect(isProtectedPath("/feedback-form")).toBe(false);
    expect(isProtectedPath("/usage-guide")).toBe(false);
  });
});
