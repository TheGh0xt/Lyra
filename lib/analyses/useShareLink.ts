"use client";

import { useState } from "react";
import { describeProblem, isProblem, type ShareTokenResponse } from "@/lib/api/client";

export type ShareState = "idle" | "creating" | "created" | "revoking" | "error";

export interface ShareLink {
  state: ShareState;
  /** Non-null exactly while a live link exists, including mid-revoke. */
  shareUrl: string | null;
  error: string | null;
  copied: boolean;
  create: () => Promise<void>;
  revoke: () => Promise<void>;
  copy: () => Promise<void>;
}

const UNREACHABLE = "Couldn't reach the server. Check your connection and try again.";

/**
 * Minting, copying and revoking a report's public link (UI_PRD §6.7).
 *
 * Extracted from `ShareControls` for UX-03, which needs the same behaviour
 * in terminal mode. It is a hook rather than a shared component because the
 * two modes cannot share markup — terminal is a CRT surface with its own
 * palette, not a re-skin of the design tokens — but they must not have two
 * copies of this logic. `LYR-05` is exactly what a second copy costs: the
 * revoke bug would have been fixed once and shipped twice.
 *
 * Builds the shareable URL itself rather than using
 * `ShareTokenResponse.url` — that field is `{cygnus_base}/v1/analyses/{id}
 * ?share_token=...` (Cygnus's own JSON endpoint, built from its own
 * `request.base_url` in `sharing_routes.py`), not a rendered page. A visitor
 * sent there would get raw JSON with no disclaimer, which fails UI_PRD
 * §6.7's requirement that a shared report carry one.
 */
export function useShareLink(analysisId: string): ShareLink {
  const [state, setState] = useState<ShareState>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setState("creating");
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/share`, { method: "POST" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(describeProblem(isProblem(payload) ? payload : null));
        setState("error");
        return;
      }
      const { token } = payload as ShareTokenResponse;
      setShareUrl(`${window.location.origin}/share/${analysisId}?share_token=${token}`);
      setState("created");
    } catch {
      setError(UNREACHABLE);
      setState("error");
    }
  }

  /**
   * LYR-05. A revoke that fails must not look like one that worked.
   *
   * This used to `await fetch(...)` without reading the result and clear the
   * link in a `finally`, so a 401 rendered identically to a 204: the user saw
   * the link disappear and believed a link that was still live had been
   * killed. The only safe local state is the one the server confirmed, so the
   * link stays — and stays revocable — until a 2xx comes back.
   */
  async function revoke() {
    setState("revoking");
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/share`, { method: "DELETE" });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setError(
          `The link is still live — ${describeProblem(isProblem(payload) ? payload : null)}`,
        );
        setState("created");
        return;
      }
    } catch {
      setError(`The link is still live — ${UNREACHABLE}`);
      setState("created");
      return;
    }
    setShareUrl(null);
    setCopied(false);
    setError(null);
    setState("idle");
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Clipboard permission denied — the URL is still shown as text.
    }
  }

  return { state, shareUrl, error, copied, create, revoke, copy };
}
