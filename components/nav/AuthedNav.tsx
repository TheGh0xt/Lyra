"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { recordUiModeSwitch } from "@/lib/telemetry/events";
import { supabaseBrowserClient } from "@/lib/supabase/browser-client";

const LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/usage", label: "Usage" },
  // UX-06. `/mfa` had two entrances and both were dead ends for the person
  // who needs it: one `router.push` in onboarding, and the step-up redirect,
  // which only fires for someone who *already* has a verified factor. Decline
  // MFA at signup and it became unreachable except by typing the URL — for a
  // security control. Named "Security" rather than "MFA" because it is the
  // destination a user scans for; the screen itself says two-factor.
  { href: "/mfa", label: "Security" },
] as const;

/**
 * The top bar for every signed-in "conventional" screen (L1/L6, 2026-09-17).
 *
 * Scoped to `/feed`, `/usage` and `/analyses/[id]` via `app/(authed)/layout.tsx`
 * — deliberately not `/onboarding` or `/mfa`, which already have their own
 * minimal exit ("← VegaIntel" in `AuthShell`) and shouldn't gain a lateral
 * "Feed"/"Terminal mode" invitation to abandon a short, single-purpose setup
 * step half-done. Not `/terminal` either — it ships its own chrome
 * (`TerminalHeader`) with its own exit, tabs and ⌘K palette; wrapping it here
 * would duplicate that, not fix anything.
 */
export function AuthedNav() {
  const pathname = usePathname();
  const router = useRouter();

  function switchToTerminal() {
    void recordUiModeSwitch("TERMINAL");
    router.push("/terminal");
  }

  async function signOut() {
    await supabaseBrowserClient().auth.signOut();
    router.push("/");
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/feed" className="font-display text-sm font-bold tracking-[-0.02em] text-text">
          VegaIntel
        </Link>
        <nav className="flex flex-wrap items-center gap-5 font-mono text-xs">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "text-text" : "text-faint hover:text-dim"}
              >
                {link.label}
              </Link>
            );
          })}
          <button type="button" onClick={switchToTerminal} className="text-faint hover:text-dim">
            Terminal mode →
          </button>
          <button type="button" onClick={() => void signOut()} className="text-faint hover:text-dim">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
