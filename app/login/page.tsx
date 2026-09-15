"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button, Input } from "@/components/ui";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isInvalidCredentials } from "@/lib/auth/supabaseErrors";
import { fetchNextRoute } from "@/lib/auth/nextRoute";

/** Sign in (UI_PRD §6.2), including the invalid-credentials state. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const { error: signInError } = await supabaseBrowserClient().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        isInvalidCredentials(signInError)
          ? "That email and password don't match an account. Check both and try again."
          : signInError.message,
      );
      setStatus("idle");
      return;
    }

    router.push(await fetchNextRoute());
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in">
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" disabled={status === "loading"} className="w-full">
          {status === "loading" ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex items-center gap-3 text-xs text-faint">
          <div className="h-px flex-1 bg-line" />
          or
          <div className="h-px flex-1 bg-line" />
        </div>
        <GoogleButton label="Continue with Google" disabled={status === "loading"} />
      </form>
      <p className="font-sans text-xs text-faint">
        New here?{" "}
        <Link href="/signup" className="text-violet-text hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
