"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/ui/cn";
import {
  THEME_STORAGE_KEY,
  isTheme,
  resolveTheme,
  type ResolvedTheme,
  type Theme,
} from "@/lib/ui/theme";

/*
 * The theme lives in localStorage and in a media query — two external systems,
 * neither of which React owns. `useSyncExternalStore` is the primitive for
 * exactly that, and it avoids the read-then-setState-in-an-effect shape that
 * causes a cascading render (and that the React compiler's lint rejects).
 *
 * The snapshot is a single string, "<choice>:<resolved>", because
 * useSyncExternalStore compares snapshots with Object.is — returning a fresh
 * object each call would loop forever.
 */

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Notifies subscribers when *this* tab changes the choice. */
const listeners = new Set<() => void>();

/**
 * The choice, when it could not be persisted.
 *
 * Without this the toggle is a dead button in private browsing: `setTheme`
 * writes nothing, `getSnapshot` re-reads storage, gets nothing back, and
 * resolves straight to the OS preference again. Cleared as soon as a write
 * succeeds, so persisted storage — including a change from another tab — is
 * always the source of truth when it is actually working.
 */
let sessionChoice: Theme | null = null;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `storage` only fires in other tabs, which is the point: two open tabs
  // should not disagree about the theme.
  window.addEventListener("storage", onChange);
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): string {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Private browsing or storage disabled: fall through to "system".
  }
  const theme: Theme = isTheme(stored) ? stored : (sessionChoice ?? "system");
  return `${theme}:${resolveTheme(theme, window.matchMedia(DARK_QUERY).matches)}`;
}

/**
 * The server cannot know the choice, so it renders the token sheet's default
 * and the inline script in layout.tsx corrects it before paint.
 */
function getServerSnapshot(): string {
  return "system:dark";
}

export function useTheme(): {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (next: Theme) => void;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, resolved] = snapshot.split(":") as [Theme, ResolvedTheme];

  // Syncing an attribute onto <html> is an external-system write, which is
  // what effects are for.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      sessionChoice = null;
    } catch {
      // Persistence is lost, but the switch must still take effect.
      sessionChoice = next;
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { theme, resolved, setTheme };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setTheme } = useTheme();
  const next: Theme = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className={cn(
        "inline-flex items-center gap-[7px] rounded-[9px] border border-line bg-surface px-[11px] py-[7px]",
        "font-sans text-xs font-medium text-dim cursor-pointer",
        "hover:text-text hover:border-line-2",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-soft",
        className,
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1L5.5 18.5" />
      </svg>
      {resolved === "dark" ? "Dark" : "Light"}
    </button>
  );
}
