"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button, Input } from "@/components/ui";
import { fetchNextRoute } from "@/lib/auth/nextRoute";
import {
  describeProblem,
  isProblem,
  type MfaEnrollResponse,
  type MfaStatusResponse,
} from "@/lib/api/client";

type Step = "loading" | "offer" | "enrolling" | "verifying" | "already-enrolled";

/**
 * Optional TOTP enrollment (UI_PRD §6.2, B.7).
 *
 * Reached right after onboarding, with a real skip — B.7's backend never
 * requires a second factor, so this screen can't either. No mockup exists
 * for this one (see the 09-15 gap list): the layout is built fresh against
 * the shared tokens rather than ported from a design file.
 */
export default function MfaEnrollPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [enrollment, setEnrollment] = useState<MfaEnrollResponse | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me/mfa")
      .then(async (response) => {
        if (!response.ok) throw new Error("mfa status request failed");
        const status = (await response.json()) as MfaStatusResponse;
        setStep(status.enrolled ? "already-enrolled" : "offer");
      })
      .catch(() => setStep("offer"));
  }, []);

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

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/me/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ factor_id: enrollment.factor_id, code }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(
          response.status === 401 || response.status === 422
            ? "That code didn't match. Check the time on your authenticator app and try again."
            : describeProblem(isProblem(payload) ? payload : null),
        );
        setBusy(false);
        return;
      }
      await finish();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (step === "loading") {
    return (
      <AuthShell title="Two-factor authentication">
        <p className="font-sans text-sm text-dim">Loading…</p>
      </AuthShell>
    );
  }

  if (step === "already-enrolled") {
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

  // step === "enrolling"
  return (
    <AuthShell
      eyebrow="Step 2 of 2"
      title="Scan or enter this code"
      subtitle="Add it to Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it shows."
    >
      <div className="flex flex-col gap-1.5 rounded-[11px] border border-line-2 bg-elev p-3">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
          Setup key
        </span>
        <code className="break-all font-mono text-sm text-text">{enrollment?.secret}</code>
      </div>
      <form onSubmit={verifyCode} className="flex flex-col gap-4">
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
