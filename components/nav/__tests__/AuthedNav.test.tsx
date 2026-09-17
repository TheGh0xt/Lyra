// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
let pathname = "/feed";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

const signOut = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({ auth: { signOut } }),
}));

import { AuthedNav } from "../AuthedNav";

afterEach(() => {
  vi.clearAllMocks();
  pathname = "/feed";
});

function stubEventsFetch() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
}

describe("AuthedNav", () => {
  it("links the wordmark, Feed and Usage to their pages", () => {
    render(<AuthedNav />);

    expect(screen.getByRole("link", { name: "VegaIntel" })).toHaveAttribute("href", "/feed");
    expect(screen.getByRole("link", { name: "Feed" })).toHaveAttribute("href", "/feed");
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("href", "/usage");
  });

  it("marks the current page's link active, not the other one", () => {
    pathname = "/usage";
    render(<AuthedNav />);

    expect(screen.getByRole("link", { name: "Usage" })).toHaveClass("text-text");
    expect(screen.getByRole("link", { name: "Feed" })).not.toHaveClass("text-text");
  });

  it("switching to terminal mode records the switch and navigates there", async () => {
    stubEventsFetch();
    render(<AuthedNav />);

    await userEvent.click(screen.getByRole("button", { name: "Terminal mode →" }));

    expect(push).toHaveBeenCalledWith("/terminal");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/events",
        expect.objectContaining({
          body: JSON.stringify({ name: "ui_mode_switched", ui_mode: "TERMINAL" }),
        }),
      ),
    );
    vi.unstubAllGlobals();
  });

  it("signs out and returns to the landing page", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<AuthedNav />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/");
  });
});
