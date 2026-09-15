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

  async function resend() {
    setSending(true);
    await supabaseBrowserClient().auth.resend({ type: "signup", email });
    setSending(false);
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
      <p className="font-sans text-xs text-faint">
        Wrong address?{" "}
        <a href="/signup" className="text-violet-text hover:underline">
          Start over
        </a>
      </p>
    </AuthShell>
  );
}
