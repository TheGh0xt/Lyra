"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button, Input } from "@/components/ui";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";
import { signUpHitExistingEmail } from "@/lib/auth/supabaseErrors";
import { EMAIL_SIGNUP_ENABLED } from "@/lib/auth/emailSignupFlag";

/**
 * Sign up (UI_PRD §6.2).
 *
 * Deliberately thin — the real onboarding work (§6.3, picking interests)
 * happens on the next screen, not here. "Fifteen seconds of work."
 */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setEmailInUse(false);

    const { data, error: signUpError } = await supabaseBrowserClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      setError(signUpError.message);
      setStatus("idle");
      return;
    }

    if (signUpHitExistingEmail(data.user)) {
      setEmailInUse(true);
      setStatus("idle");
      return;
    }

    router.push(`/verify-pending?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="5 free analyses a month. No card, not now, not later."
    >
      {emailInUse ? (
        <div role="alert" className="flex flex-col gap-3 rounded-[13px] border border-am bg-am-soft p-4">
          <p className="m-0 font-sans text-sm text-text">
            An account already exists for <strong>{email}</strong>.
          </p>
          <Link href="/login" className="font-sans text-sm font-semibold text-violet-text hover:underline">
            Sign in instead →
          </Link>
        </div>
      ) : EMAIL_SIGNUP_ENABLED ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            label="Password"
            required
            minLength={10}
            autoComplete="new-password"
            hint="At least 10 characters, with a digit, an upper- and a lowercase letter, and a symbol."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Creating account…" : "Create account"}
          </Button>
          <div className="flex items-center gap-3 text-xs text-faint">
            <div className="h-px flex-1 bg-line" />
            or
            <div className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton label="Continue with Google" disabled={status === "loading"} />
        </form>
      ) : (
        <GoogleButton label="Continue with Google" variant="primary" />
      )}
      <p className="font-sans text-xs text-faint">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-text hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
