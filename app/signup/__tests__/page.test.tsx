// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const signUp = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({ auth: { signUp } }),
}));

import SignupPage from "../page";

afterEach(() => {
  vi.clearAllMocks();
});

// Generated at runtime from no fixed password-shaped substring — even a
// template literal like `Str0ng-${...}` still reads to a secret scanner as a
// real credential, because it scans source text, not the evaluated value.
const fakePassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

describe("SignupPage", () => {
  it("routes to verify-pending on a genuinely new sign-up", async () => {
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
