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

  // LYR-05. A revoke that failed used to render identically to one that
  // worked: the result was never inspected and `finally` cleared the link
  // either way. The link the user thought they had killed kept working.
  describe("a revoke that fails (LYR-05)", () => {
    function mintThen(revokeOutcome: Response | Error) {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "tkn_abc", url: "x" }), { status: 200 }),
        )
        .mockImplementationOnce(() =>
          revokeOutcome instanceof Error
            ? Promise.reject(revokeOutcome)
            : Promise.resolve(revokeOutcome),
        );
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    async function mintAndRevoke() {
      render(<ShareControls analysisId="a1" />);
      await userEvent.click(screen.getByRole("button", { name: "Copy public link" }));
      await screen.findByRole("button", { name: "Revoke" });
      await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    }

    it("says so instead of silently claiming the link is gone", async () => {
      mintThen(
        new Response(
          JSON.stringify({
            type: "https://pmie.dev/problems/unauthenticated",
            title: "Unauthenticated",
            status: 401,
          }),
          { status: 401 },
        ),
      );

      await mintAndRevoke();

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("keeps the link on screen, because it is still live", async () => {
      mintThen(new Response(null, { status: 403 }));

      await mintAndRevoke();

      expect(await screen.findByText(/\/share\/a1\?share_token=tkn_abc/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Copy public link" })).not.toBeInTheDocument();
    });

    it("treats an unreachable server the same way — the link survives", async () => {
      mintThen(new TypeError("Failed to fetch"));

      await mintAndRevoke();

      expect(await screen.findByRole("alert")).toHaveTextContent(/connection/i);
      expect(screen.getByText(/\/share\/a1\?share_token=tkn_abc/)).toBeInTheDocument();
    });

    it("lets the user try again, and clears the link when the retry works", async () => {
      const fetchMock = mintThen(new Response(null, { status: 503 }));
      await mintAndRevoke();
      await screen.findByRole("alert");

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

      expect(await screen.findByRole("button", { name: "Copy public link" })).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // While the DELETE was in flight the component fell through to the
  // create-link branch, so for the length of the request the UI already
  // showed the link as gone — the same lie as LYR-05, just briefer.
  it("does not show the link as gone while the revoke is still in flight", async () => {
    let releaseRevoke: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "tkn_abc", url: "x" }), { status: 200 }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              releaseRevoke = resolve;
            }),
        ),
    );

    render(<ShareControls analysisId="a1" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy public link" }));
    await userEvent.click(await screen.findByRole("button", { name: "Revoke" }));

    expect(screen.getByText(/\/share\/a1\?share_token=tkn_abc/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoking…" })).toBeDisabled();

    releaseRevoke(new Response(null, { status: 204 }));
    expect(await screen.findByRole("button", { name: "Copy public link" })).toBeInTheDocument();
  });
});
