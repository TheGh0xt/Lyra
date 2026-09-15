// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import OnboardingPage from "../page";

const CATEGORIES = [
  { slug: "politics", label: "Politics", sort_order: 0 },
  { slug: "crypto", label: "Crypto", sort_order: 1 },
  { slug: "ai", label: "AI", sort_order: 2 },
  { slug: "sports", label: "Sports", sort_order: 3 },
  { slug: "health", label: "Health", sort_order: 4 },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  push.mockClear();
});

function stubFetch(responses: Record<string, Response | (() => Response)>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const match = Object.entries(responses).find(([path]) => url.includes(path));
      if (!match) throw new Error(`unexpected fetch: ${url}`);
      const response = match[1];
      return typeof response === "function" ? response() : response;
    }),
  );
}

describe("OnboardingPage", () => {
  it("disables Continue until at least 3 categories are picked", async () => {
    stubFetch({
      "/api/interests/categories": new Response(
        JSON.stringify({ categories: CATEGORIES }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    });
    render(<OnboardingPage />);

    const continueButton = await screen.findByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Politics/ }));
    await userEvent.click(screen.getByRole("button", { name: /Crypto/ }));
    expect(continueButton).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /AI/ }));
    expect(continueButton).toBeEnabled();
  });

  it("allows exactly five and enables Continue at the max", async () => {
    stubFetch({
      "/api/interests/categories": new Response(
        JSON.stringify({ categories: CATEGORIES }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    });
    render(<OnboardingPage />);
    await screen.findByRole("button", { name: /Politics/ });

    for (const label of ["Politics", "Crypto", "AI", "Sports", "Health"]) {
      await userEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
    }

    expect(screen.getByText("5 of 5 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    for (const label of ["Politics", "Crypto", "AI", "Sports", "Health"]) {
      expect(screen.getByRole("button", { name: new RegExp(label) })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
  });

  it("skip submits a valid default selection and moves on", async () => {
    stubFetch({
      "/api/interests/categories": new Response(
        JSON.stringify({ categories: CATEGORIES }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
      "/api/me/interests": new Response(
        JSON.stringify({ interests: ["politics", "crypto", "ai"] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    });
    render(<OnboardingPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Skip — use defaults" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/mfa"));
  });

  it("shows an error and does not navigate when Cygnus rejects the selection", async () => {
    stubFetch({
      "/api/interests/categories": new Response(
        JSON.stringify({ categories: CATEGORIES }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
      "/api/me/interests": new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/invalid-request",
          title: "Bad request",
          status: 422,
          detail: "Unknown category slug.",
        }),
        { status: 422, headers: { "content-type": "application/problem+json" } },
      ),
    });
    render(<OnboardingPage />);

    await userEvent.click(await screen.findByRole("button", { name: /Politics/ }));
    await userEvent.click(screen.getByRole("button", { name: /Crypto/ }));
    await userEvent.click(screen.getByRole("button", { name: /AI/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("That request couldn't be understood.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
