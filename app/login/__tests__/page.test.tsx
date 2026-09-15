// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({ auth: { signInWithPassword } }),
}));

vi.mock("@/lib/auth/nextRoute", () => ({ fetchNextRoute: vi.fn().mockResolvedValue("/analyze") }));

import LoginPage from "../page";

afterEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("shows the invalid-credentials state without revealing which field was wrong", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email"), "a@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(/don't match an account/),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("routes onward on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email"), "a@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyze"));
  });
});
