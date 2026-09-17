// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareControls } from "../ShareControls";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ShareControls", () => {
  it("mints a link and builds a Lyra page URL, not Cygnus's raw API url field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: "tkn_abc",
            url: "https://cygnus.example/v1/analyses/a1?share_token=tkn_abc",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    render(<ShareControls analysisId="a1" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy public link" }));

    const link = await screen.findByText(/\/share\/a1\?share_token=tkn_abc/);
    expect(link.textContent).not.toContain("cygnus.example");
  });

  it("shows an error and stays revocable-free when minting fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: "https://pmie.dev/problems/internal-error",
            title: "Internal error",
            status: 503,
            detail: "Sharing is not configured.",
          }),
          { status: 503 },
        ),
      ),
    );

    render(<ShareControls analysisId="a1" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy public link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side.");
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("revoking returns to the create-link state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: "tkn_abc", url: "x" }), { status: 200 }),
      ),
    );

    render(<ShareControls analysisId="a1" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy public link" }));
    await screen.findByRole("button", { name: "Revoke" });

    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

    expect(await screen.findByRole("button", { name: "Copy public link" })).toBeInTheDocument();
  });
});
