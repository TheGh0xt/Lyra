import { describe, expect, it } from "vitest";
import type { AuthError, User } from "@supabase/supabase-js";
import { isInvalidCredentials, signUpHitExistingEmail } from "../supabaseErrors";

function authError(message: string): AuthError {
  return { message } as AuthError;
}

function user(identities: unknown[] | undefined): User {
  return { identities } as unknown as User;
}

describe("isInvalidCredentials", () => {
  it("matches Supabase's generic bad-login message", () => {
    expect(isInvalidCredentials(authError("Invalid login credentials"))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isInvalidCredentials(authError("INVALID LOGIN CREDENTIALS"))).toBe(true);
  });

  it("doesn't match an unrelated error", () => {
    expect(isInvalidCredentials(authError("Email not confirmed"))).toBe(false);
  });
});

describe("signUpHitExistingEmail", () => {
  it("is true when identities came back empty (existing, confirmed email)", () => {
    expect(signUpHitExistingEmail(user([]))).toBe(true);
  });

  it("is false for a genuinely new sign-up", () => {
    expect(signUpHitExistingEmail(user([{ id: "google" }]))).toBe(false);
  });

  it("is false when there's no user at all", () => {
    expect(signUpHitExistingEmail(null)).toBe(false);
  });
});
