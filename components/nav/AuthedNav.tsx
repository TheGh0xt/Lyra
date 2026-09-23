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
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/feed"
          className={`font-display text-sm font-bold tracking-[-0.02em] text-text ${TAP_CLASS}`}
        >
          VegaIntel
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 font-mono text-xs sm:gap-x-5">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${TAP_CLASS} ${active ? "text-text" : "text-faint hover:text-dim"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={switchToTerminal}
            /*
             * The visible label drops "mode" on a phone to fit, but the
             * accessible name must not change with the viewport — so it is
             * pinned here rather than left to whatever the visible fragments
             * happen to concatenate to. (They concatenate badly: a space
             * split across elements is dropped by the name algorithm, giving
             * "Terminalmode".)
             */
            aria-label="Terminal mode →"
            className={`${TAP_CLASS} text-faint hover:text-dim`}
          >
            Terminal<span className="hidden sm:inline">&nbsp;mode</span> →
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className={`${TAP_CLASS} text-faint hover:text-dim`}
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}

/*
 * UX-05. Every item in this bar rendered as a 16px-tall hit area — under the
 * 24px WCAG 2.5.8 minimum, and packed 20px apart. On a phone that is a
 * mis-tap generator, and the two most destructive neighbours are "Terminal
 * mode" and "Sign out": a fat-fingered mode switch signs the tester out
 * instead. The text stays the same size; only the touchable box grows, and
 * only below `sm`, so the desktop bar is unchanged.
 */
const TAP_CLASS = "inline-flex min-h-11 items-center sm:min-h-0";
