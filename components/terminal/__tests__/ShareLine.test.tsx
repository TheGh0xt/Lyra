// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareLine } from "../ShareLine";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mintLink() {
  await userEvent.click(screen.getByRole("button", { name: "COPY PUBLIC LINK" }));
  await screen.findByRole("button", { name: "REVOKE" });
}

describe("ShareLine (UX-03)", () => {
  it("mints a link to the Lyra share page, not to Cygnus's raw API url", async () => {
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

    render(<ShareLine analysisId="a1" />);
    await mintLink();

    const link = await screen.findByText(/\/share\/a1\?share_token=tkn_abc/);
    expect(link.textContent).not.toContain("cygnus.example");
  });

  // The reason UX-03's share slice waited for LYR-05: reusing the logic
  // before it was fixed would have shipped the same lie in a second mode.
  // This asserts the fix reaches terminal mode too, rather than trusting
  // that it does because the hook is shared.
  it("keeps the link on screen when a revoke fails, because it is still live", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "tkn_abc", url: "x" }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 403 })),
    );

    render(<ShareLine analysisId="a1" />);
    await mintLink();
    await userEvent.click(screen.getByRole("button", { name: "REVOKE" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("still live");
    expect(screen.getByText(/\/share\/a1\?share_token=tkn_abc/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "REVOKE" })).toBeInTheDocument();
  });

  it("clears the link only once the server confirms the revoke", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "tkn_abc", url: "x" }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );

    render(<ShareLine analysisId="a1" />);
    await mintLink();
    await userEvent.click(screen.getByRole("button", { name: "REVOKE" }));

    expect(await screen.findByRole("button", { name: "COPY PUBLIC LINK" })).toBeInTheDocument();
    expect(screen.queryByText(/share_token/)).not.toBeInTheDocument();
  });

  it("says what went wrong when the link cannot be minted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    render(<ShareLine analysisId="a1" />);
    await userEvent.click(screen.getByRole("button", { name: "COPY PUBLIC LINK" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/connection/i);
    expect(screen.queryByRole("button", { name: "REVOKE" })).not.toBeInTheDocument();
  });
});
