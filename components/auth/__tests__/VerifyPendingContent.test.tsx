// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("email=a%40example.com"),
}));

const resend = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({ auth: { resend } }),
}));

import { VerifyPendingContent } from "../VerifyPendingContent";

afterEach(() => {
  vi.clearAllMocks();
});

describe("VerifyPendingContent", () => {
  it("confirms once resend actually succeeds", async () => {
    resend.mockResolvedValue({ error: null });
    render(<VerifyPendingContent />);

    await userEvent.click(screen.getByRole("button", { name: "Resend verification email" }));

    expect(await screen.findByRole("button", { name: "Sent again" })).toBeInTheDocument();
  });

  it("surfaces the failure instead of claiming success (e.g. the 2/hour cap)", async () => {
    resend.mockResolvedValue({ error: { message: "Email rate limit exceeded" } });
    render(<VerifyPendingContent />);

    await userEvent.click(screen.getByRole("button", { name: "Resend verification email" }));

    expect(await screen.findByText("Email rate limit exceeded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sent again" })).not.toBeInTheDocument();
  });
});
