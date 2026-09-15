"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";

/** Email-verification-pending (UI_PRD §6.2), shown right after sign-up. */
export function VerifyPendingContent() {
  const email = useSearchParams().get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setError(null);
    setResent(false);
    const { error: resendError } = await supabaseBrowserClient().auth.resend({
      type: "signup",
      email,
    });
    setSending(false);
    if (resendError) {
      // Supabase's own sender caps at 2/hour, so this is the common outcome
      // here, not an edge case — a silently-"successful" button would send
      // someone back to an inbox that's never getting a second email.
      setError(resendError.message);
      return;
    }
    setResent(true);
  }

  return (
    <AuthShell eyebrow="One more step" title="Check your email">
      <p className="font-sans text-sm leading-relaxed text-dim">
        We sent a verification link to{" "}
        {email ? <strong className="text-text">{email}</strong> : "your inbox"}. Click it to
        activate your account — this tab will pick up automatically once you do.
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={resend}
        disabled={sending || !email}
        className="w-full"
      >
        {sending ? "Sending…" : resent ? "Sent again" : "Resend verification email"}
      </Button>
      {error ? (
        <p role="alert" className="font-sans text-sm text-ro">
          {error}
        </p>
      ) : null}
      <p className="font-sans text-xs text-faint">
        Wrong address?{" "}
        <a href="/signup" className="text-violet-text hover:underline">
          Start over
        </a>
      </p>
    </AuthShell>
  );
}
