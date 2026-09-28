// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const signUp = vi.fn();
const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({ auth: { signUp, signInWithOAuth } }),
}));

const fetchNextRoute = vi.fn();
vi.mock("@/lib/auth/nextRoute", () => ({ fetchNextRoute }));

// Generated at runtime from no fixed password-shaped substring — even a
// template literal like `Str0ng-${...}` still reads to a secret scanner as a
// real credential, because it scans source text, not the evaluated value.
const fakePassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

async function renderSignup() {
  const { default: SignupPage } = await import("../page");
  render(<SignupPage />);
}

async function submit(email: string, password = fakePassword) {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignupPage", () => {
  it("offers email and password, not Google alone", async () => {
    await renderSignup();

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("starts the Google OAuth flow with the callback redirect", async () => {
    await renderSignup();

    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({ redirectTo: expect.stringContaining("/auth/callback") }),
      }),
    );
  });

  it("still links to sign-in for an existing account", async () => {
    await renderSignup();

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});

// The whole point of turning email sign-up back on: with Supabase's "Confirm
// email" off, `signUp` hands back a live session and there is nothing to
// wait for. Sending that user to "check your email" would strand them at a
// screen describing a message that is never sent.
describe("SignupPage — Supabase confirmations OFF (signUp returns a session)", () => {
  it("sends the user straight into the app, never to verify-pending", async () => {
    fetchNextRoute.mockResolvedValue("/onboarding");
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "email" }] }, session: { access_token: "tok" } },
      error: null,
    });
    await renderSignup();

    await submit("new@example.com");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining("/verify-pending"));
  });

  it("asks where to go rather than hardcoding onboarding", async () => {
    fetchNextRoute.mockResolvedValue("/mfa");
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "email" }] }, session: { access_token: "tok" } },
      error: null,
    });
    await renderSignup();

    await submit("new@example.com");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/mfa"));
  });

  // With confirmations off, Supabase drops the enumeration protection that
  // produces the empty-`identities` tell and returns a plain error instead.
  // That used to land as raw API text under the password field.
  it("shows the friendly email-in-use panel for 'User already registered'", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });
    await renderSignup();

    await submit("existing@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("existing@example.com");
    expect(screen.getByRole("link", { name: /Sign in instead/ })).toBeInTheDocument();
    expect(screen.queryByText("User already registered")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("SignupPage — Supabase confirmations ON (signUp returns no session)", () => {
  it("routes to verify-pending on a genuinely new sign-up", async () => {
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "email" }] }, session: null },
      error: null,
    });
    await renderSignup();

    await submit("new@example.com");

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/verify-pending?email=new%40example.com"),
    );
  });

  it("shows the email-in-use state instead of a fake success", async () => {
    signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    await renderSignup();

    await submit("existing@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("existing@example.com");
    expect(screen.getByRole("link", { name: /Sign in instead/ })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("SignupPage — errors", () => {
  it("shows Supabase's own error inline (e.g. a weak password)", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Password should be at least 10 characters." },
    });
    await renderSignup();

    await submit("a@example.com", "short");

    expect(
      await screen.findByText("Password should be at least 10 characters."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

// Kept so the Google-only configuration stays exercised rather than becoming
// untested dead code the day it is needed again.
describe("SignupPage (EMAIL_SIGNUP_ENABLED=false)", () => {
  it("falls back to Google alone", async () => {
    vi.doMock("@/lib/auth/emailSignupFlag", () => ({ EMAIL_SIGNUP_ENABLED: false }));
    await renderSignup();

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });
});
