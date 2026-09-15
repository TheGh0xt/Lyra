"use client";

import { Button } from "@/components/ui";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";

/**
 * Continue-with-Google, shared by sign-up and sign-in.
 *
 * Both are the same call — Supabase doesn't distinguish "new" vs. "existing"
 * for OAuth, it upserts either way — so there is nothing sign-up-specific to
 * do here that sign-in doesn't also need.
 */
export function GoogleButton({ label, disabled }: { label: string; disabled?: boolean }) {
  async function start() {
    await supabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={start} disabled={disabled} className="w-full">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.87 8.87 4.75 12 4.75z"
        />
      </svg>
      {label}
    </Button>
  );
}
