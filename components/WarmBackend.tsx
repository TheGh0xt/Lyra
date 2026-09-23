"use client";

import { useEffect } from "react";

/**
 * Fires one fire-and-forget ping at `/api/warm` on mount.
 *
 * Renders nothing. Mounted on the screens a visitor sits on *before* they
 * need the API — the landing page, sign-in, sign-up — so the backend's ~100s
 * cold start overlaps with them reading and typing instead of landing on
 * their first feed load. See `app/api/warm/route.ts` for why one ping is
 * enough to wake both services.
 *
 * Deliberately not in the root layout: on an authenticated screen the real
 * request is already in flight, so a warm ping there is a duplicate that
 * buys nothing.
 *
 * `keepalive` lets the ping outlive the navigation it started on — a visitor
 * who hits "Sign in" two seconds after the page loads should still get the
 * benefit, not have their wake-up cancelled by their own click.
 */
export function WarmBackend() {
  useEffect(() => {
    void fetch("/api/warm", { method: "GET", keepalive: true }).catch(() => {
      // A failed warm-up is not a failure the visitor should ever see: the
      // page they are on does not need the backend, and the screen that does
      // has its own error handling.
    });
  }, []);

  return null;
}
