// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/auth/nextRoute", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/auth/nextRoute")>(
    "../../../lib/auth/nextRoute",
  );
  return { ...actual, fetchNextRoute: vi.fn().mockResolvedValue("/analyze") };
});

const getAuthenticatorAssuranceLevel = vi.fn();
const listFactors = vi.fn();
const challengeAndVerify = vi.fn();
vi.mock("@/lib/supabase/browser-client", () => ({
  supabaseBrowserClient: () => ({
    auth: { mfa: { getAuthenticatorAssuranceLevel, listFactors, challengeAndVerify } },
  }),
}));

vi.mock("qrcode", () => ({
  default: { toString: vi.fn().mockResolvedValue("<svg>qr</svg>") },
}));

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

function notEnrolled() {
  stubFetch({ "/api/me/mfa": new Response(JSON.stringify({ enrolled: false }), { status: 200 }) });
}

describe("MfaEnrollPage", () => {
  it("offers enrollment when the user has no factor yet", async () => {
    notEnrolled();
    render(<MfaEnrollPage />);

    expect(await screen.findByText("Secure your account")).toBeInTheDocument();
  });

  it("skip for now routes onward without enrolling", async () => {
    notEnrolled();
    render(<MfaEnrollPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyze"));
  });

  it("lets an already-stepped-up (aal2) user through with a plain continue, no code asked", async () => {
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: true, verified_at: "2026-01-01" }), {
        status: 200,
      }),
    });
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
    });
    render(<MfaEnrollPage />);

    expect(
      await screen.findByText("Two-factor authentication is enabled"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("6-digit code")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyze"));
  });

  it("F12: a verified-but-unstepped-up (aal1) user is asked for a code, and it steps them up client-side, not via Cygnus", async () => {
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: true, verified_at: "2026-01-01" }), {
        status: 200,
      }),
    });
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
    });
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "existing-factor", status: "verified" }] },
      error: null,
    });
    challengeAndVerify.mockResolvedValue({ data: { access_token: "new-aal2-token" }, error: null });
    render(<MfaEnrollPage />);

    expect(await screen.findByText("Enter your authenticator code")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() =>
      expect(challengeAndVerify).toHaveBeenCalledWith({
        factorId: "existing-factor",
        code: "123456",
      }),
    );
    // The whole point of F12: no call to Cygnus's own verify route.
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/me/mfa/verify"),
      expect.anything(),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyze"));
  });

  it("shows a plain error on a wrong step-up code, without navigating", async () => {
    stubFetch({
      "/api/me/mfa": new Response(JSON.stringify({ enrolled: true, verified_at: "2026-01-01" }), {
        status: 200,
      }),
    });
    getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
    });
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "existing-factor", status: "verified" }] },
      error: null,
    });
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { message: "invalid code", status: 401 },
    });
    render(<MfaEnrollPage />);

    await userEvent.type(await screen.findByLabelText("6-digit code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(await screen.findByText(/didn't match/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("walks enroll -> QR + setup key -> verify, entirely client-side, and shows a plain error on a wrong code", async () => {
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
    });
    challengeAndVerify.mockResolvedValueOnce({
      data: null,
      error: { message: "invalid code", status: 401 },
    });
    render(<MfaEnrollPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Enable two-factor authentication" }),
    );

    expect(await screen.findByText(fakeSecret)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /qr code/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("6-digit code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Verify and finish" }));

    expect(await screen.findByText(/didn't match/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: "f1", code: "000000" });

    challengeAndVerify.mockResolvedValueOnce({ data: { access_token: "tok" }, error: null });
    await userEvent.clear(screen.getByLabelText("6-digit code"));
    await userEvent.type(screen.getByLabelText("6-digit code"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Verify and finish" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/analyze"));
  });
});
