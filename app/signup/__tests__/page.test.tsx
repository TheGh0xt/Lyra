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

// Generated at runtime from no fixed password-shaped substring — even a
// template literal like `Str0ng-${...}` still reads to a secret scanner as a
// real credential, because it scans source text, not the evaluated value.
const fakePassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("SignupPage (Google-only, EMAIL_SIGNUP_ENABLED=false — Lyra#13 review)", () => {
  it("offers only Google, no email/password form", async () => {
    const { default: SignupPage } = await import("../page");
    render(<SignupPage />);

    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("starts the Google OAuth flow with the callback redirect", async () => {
    const { default: SignupPage } = await import("../page");
    render(<SignupPage />);

    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({ redirectTo: expect.stringContaining("/auth/callback") }),
      }),
    );
  });

  it("still links to sign-in for an existing account", async () => {
    const { default: SignupPage } = await import("../page");
    render(<SignupPage />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});

describe("SignupPage (email path — dormant until H3, exercised here so it isn't untested code)", () => {
  it("routes to verify-pending on a genuinely new sign-up", async () => {
    vi.doMock("@/lib/auth/emailSignupFlag", () => ({ EMAIL_SIGNUP_ENABLED: true }));
    const { default: SignupPage } = await import("../page");
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "email" }] } },
      error: null,
    });
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), fakePassword);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/verify-pending?email=new%40example.com"),
    );
  });

  it("shows the email-in-use state instead of a fake success", async () => {
    vi.doMock("@/lib/auth/emailSignupFlag", () => ({ EMAIL_SIGNUP_ENABLED: true }));
    const { default: SignupPage } = await import("../page");
    signUp.mockResolvedValue({
      data: { user: { identities: [] } },
      error: null,
    });
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Email"), "existing@example.com");
    await userEvent.type(screen.getByLabelText("Password"), fakePassword);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("existing@example.com");
    expect(screen.getByRole("link", { name: /Sign in instead/ })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows Supabase's own error inline (e.g. a weak password)", async () => {
    vi.doMock("@/lib/auth/emailSignupFlag", () => ({ EMAIL_SIGNUP_ENABLED: true }));
    const { default: SignupPage } = await import("../page");
    signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "Password should be at least 10 characters." },
    });
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText("Email"), "a@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Password should be at least 10 characters.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
