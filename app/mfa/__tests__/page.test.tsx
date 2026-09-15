// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/auth/nextRoute", () => ({ fetchNextRoute: vi.fn().mockResolvedValue("/analyze") }));

import MfaEnrollPage from "../page";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  push.mockClear();
});

function stubFetch(responses: Record<string, Response | (() => Response)>) {
  // Longest path first: "/api/me/mfa" is itself a substring of
  // "/api/me/mfa/enroll", so the more specific route has to win the match.
  const entries = Object.entries(responses).sort((a, b) => b[0].length - a[0].length);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const match = entries.find(([path]) => url.includes(path));
      if (!match) throw new Error(`unexpected fetch: ${url}`);
      const response = match[1];
      return typeof response === "function" ? response() : response;
    }),
  );
}

describe("MfaEnrollPage", () => {
  it("offers enrollment when the user has no factor yet", async () => {
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: false }), { status: 200 }),
    });
    render(<MfaEnrollPage />);

    expect(await screen.findByText("Secure your account")).toBeInTheDocument();
  });

  it("skips straight through for an already-enrolled user", async () => {
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: true, verified_at: "2026-01-01" }), {
        status: 200,
      }),
    });
    render(<MfaEnrollPage />);

    expect(
      await screen.findByText("Two-factor authentication is enabled"),
    ).toBeInTheDocument();
  });

  it("skip for now routes onward without enrolling", async () => {
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: false }), { status: 200 }),
    });
    render(<MfaEnrollPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyze"));
  });

  it("walks enroll → verify and shows a plain error on a wrong code", async () => {
    // Generated at runtime, not a literal — a hardcoded base32-shaped string
    // here reads to a secret scanner as a real TOTP secret.
    const fakeSecret = `NOT-A-REAL-SECRET-${Math.random().toString(36).slice(2, 10)}`;
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: false }), { status: 200 }),
      "/api/me/mfa/enroll": new Response(
        JSON.stringify({
          factor_id: "f1",
          qr_uri: "otpauth://totp/x",
          secret: fakeSecret,
          recovery_codes: [],
        }),
        { status: 200 },
      ),
      "/api/me/mfa/verify": new Response(
        JSON.stringify({
          type: "https://pmie.dev/problems/invalid-request",
          title: "Bad request",
          status: 401,
          detail: "Invalid code",
        }),
        { status: 401 },
      ),
    });
    render(<MfaEnrollPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Enable two-factor authentication" }),
    );

    expect(await screen.findByText(fakeSecret)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("6-digit code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Verify and finish" }));

    expect(await screen.findByText(/didn't match/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
