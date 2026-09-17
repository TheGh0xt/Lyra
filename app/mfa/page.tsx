"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button, Input } from "@/components/ui";
import { fetchNextRoute, needsMfaStepUp } from "@/lib/auth/nextRoute";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";
import { generateQrSvg } from "@/lib/mfa/qrCode";
import {
  describeProblem,
  isProblem,
  type MfaEnrollResponse,
  type MfaStatusResponse,
} from "@/lib/api/client";

type Step = "loading" | "offer" | "enrolling" | "challenge" | "stepped-up" | "load-error";

const WRONG_CODE_MESSAGE =
  "That code didn't match. Check the time on your authenticator app and try again.";

/**
 * TOTP enrollment AND step-up (UI_PRD §6.2, B.7; F12/F13, 2026-09-17).
 *
 * F12: the code check itself now runs entirely client-side, via Supabase's
 * own SDK (`auth.mfa.challengeAndVerify`) — never Cygnus's `POST
 * /v1/me/mfa/verify`. That endpoint does the same GoTrue challenge/verify
 * server-side and then discards the response, which carries a fresh aal2
 * session; the browser's own session stayed aal1 forever, and every route
 * but `/v1/me/mfa` itself 401s an aal1 session with a verified factor (see
 * Cygnus's access.py). The SDK call stores the returned aal2 session
 * itself, which is what actually closes the loop — no Cygnus change
 * needed, and nothing to forward by hand.
 *
 * That same deadlock isn't only a first-enrollment bug: Supabase requires a
 * fresh step-up on *every* session, not once ever, so a previously-enrolled
 * user hits it on every sign-in too. This page now doubles as that step-up
 * screen (the "challenge" step below) — `fetchNextRoute`/`/auth/callback`
 * route here first, before ever calling `/v1/me`, whenever the session's
 * own assurance level says a verified factor hasn't been stepped up to yet.
 *
 * Abandoned enrollment (start, never verify, close the tab) was checked and
 * is safe as-is: Supabase only counts a *verified* factor for the aal2 gate
 * (see Cygnus's `FactorLookup`/`test_unverified_totp_factor_is_not_enrolled`),
 * so a dangling unverified factor never locks anyone out, and returning to
 * this page just starts a fresh enrollment — Supabase allows more than one
 * TOTP factor per account. There is no unenroll endpoint in the frozen
 * contract to clear the abandoned one from here; that's a contract change,
 * not something this page can fix.
 */
export default function MfaEnrollPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [enrollment, setEnrollment] = useState<MfaEnrollResponse | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [stepUpFactorId, setStepUpFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const statusResponse = await fetch("/api/me/mfa").catch(() => null);
      if (!statusResponse?.ok) {
        if (!cancelled) setStep("load-error");
        return;
      }
      const status = (await statusResponse.json()) as MfaStatusResponse;

      if (!status.enrolled) {
        if (!cancelled) setStep("offer");
        return;
      }

      const { data: aal } = await supabaseBrowserClient().auth.mfa.getAuthenticatorAssuranceLevel();
      if (!needsMfaStepUp(aal?.currentLevel, aal?.nextLevel)) {
        if (!cancelled) setStep("stepped-up");
        return;
      }

      const { data: factors } = await supabaseBrowserClient().auth.mfa.listFactors();
      const verified = factors?.totp[0];
      if (!verified) {
        if (!cancelled) setStep("load-error");
        return;
      }
      if (!cancelled) {
        setStepUpFactorId(verified.id);
        setStep("challenge");
      }
    }

    load().catch(() => {
      if (!cancelled) setStep("load-error");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enrollment?.qr_uri) return;
    let cancelled = false;
    generateQrSvg(enrollment.qr_uri)
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollment?.qr_uri]);

  async function finish() {
    router.push(await fetchNextRoute());
  }

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/me/mfa/enroll", { method: "POST" });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(describeProblem(isProblem(payload) ? payload : null));
        setBusy(false);
        return;
      }
      setEnrollment(payload as MfaEnrollResponse);
      setStep("enrolling");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAgainst(factorId: string, event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabaseBrowserClient().auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (verifyError) {
      setError(
        verifyError.status === 401 || verifyError.status === 422
          ? WRONG_CODE_MESSAGE
          : verifyError.message,
      );
      setBusy(false);
      return;
    }
    await finish();
  }

  if (step === "loading") {
    return (
      <AuthShell title="Two-factor authentication">
        <p className="font-sans text-sm text-dim">Loading…</p>
      </AuthShell>
    );
  }

  if (step === "load-error") {
    return (
      <AuthShell title="Two-factor authentication">
        <p role="alert" className="font-sans text-sm text-ro">
          Couldn&apos;t load your authenticator status. Refresh to try again.
        </p>
      </AuthShell>
    );
  }

  if (step === "stepped-up") {
    return (
      <AuthShell eyebrow="Already on" title="Two-factor authentication is enabled">
        <p className="font-sans text-sm text-dim">
          Your account already has a verified authenticator.
        </p>
        <Button type="button" onClick={finish} className="w-full">
          Continue
        </Button>
      </AuthShell>
    );
  }

  if (step === "offer") {
    return (
      <AuthShell
        eyebrow="Optional, recommended"
        title="Secure your account"
        subtitle="Add a time-based one-time code from an authenticator app. Entirely optional — you can turn this on later from settings instead."
      >
        {error ? (
          <p role="alert" className="font-sans text-sm text-ro">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={startEnrollment} disabled={busy} className="w-full">
          {busy ? "Starting…" : "Enable two-factor authentication"}
        </Button>
        <button
          type="button"
          onClick={finish}
          className="font-sans text-xs font-medium text-faint hover:text-dim"
        >
          Skip for now
        </button>
      </AuthShell>
    );
  }

  if (step === "challenge") {
    return (
      <AuthShell
        eyebrow="One more step"
        title="Enter your authenticator code"
        subtitle="Your account has two-factor authentication enabled. Enter the 6-digit code from your authenticator app to continue."
      >
        <form
          onSubmit={(event) => stepUpFactorId && verifyAgainst(stepUpFactorId, event)}
          className="flex flex-col gap-4"
        >
          <Input
            label="6-digit code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            error={error ?? undefined}
          />
          <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
            {busy ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      </AuthShell>
    );
  }

  // step === "enrolling"
  return (
    <AuthShell
      eyebrow="Step 2 of 2"
      title="Scan or enter this code"
      subtitle="Add it to Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it shows."
    >
      {qrSvg ? (
        <div
          role="img"
          aria-label="QR code for authenticator app setup"
          className="flex justify-center rounded-[11px] border border-line-2 bg-white p-3"
          // Generated by us, from `qrcode`, against a URI Cygnus just
          // returned — not user input. See lib/mfa/qrCode.ts.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      ) : null}
      <div className="flex flex-col gap-1.5 rounded-[11px] border border-line-2 bg-elev p-3">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
          Can&apos;t scan? Enter this setup key instead
        </span>
        <code className="break-all font-mono text-sm text-text">{enrollment?.secret}</code>
      </div>
      <form
        onSubmit={(event) => enrollment && verifyAgainst(enrollment.factor_id, event)}
        className="flex flex-col gap-4"
      >
        <Input
          label="6-digit code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          error={error ?? undefined}
        />
        <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
          {busy ? "Verifying…" : "Verify and finish"}
        </Button>
      </form>
    </AuthShell>
  );
}
