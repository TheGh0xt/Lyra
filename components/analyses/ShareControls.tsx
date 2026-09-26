"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { describeProblem, isProblem, type ShareTokenResponse } from "@/lib/api/client";

type State = "idle" | "busy" | "created" | "revoking" | "error";

const UNREACHABLE = "Couldn't reach the server. Check your connection and try again.";

/**
 * "Copy public link" / revoke (UI_PRD §6.7).
 *
 * Builds the shareable URL itself rather than using
 * `ShareTokenResponse.url` — that field is `{cygnus_base}/v1/analyses/{id}
 * ?share_token=...` (Cygnus's own JSON endpoint, built from its own
 * `request.base_url` in `sharing_routes.py`), not a rendered page. A
 * visitor sent there would get raw JSON with no disclaimer, which fails
 * UI_PRD §6.7's requirement that a shared report carry one.
 */
export function ShareControls({ analysisId }: { analysisId: string }) {
  const [state, setState] = useState<State>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setState("busy");
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
   * link stays on screen — and stays revocable — until a 2xx comes back.
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
      // Clipboard permission denied — the URL is still shown as text below.
    }
  }

  // Keyed off `shareUrl`, not off `state === "created"`: while the DELETE is
  // in flight the state is "revoking", and falling through to the create-link
  // branch would show the link as already gone — LYR-05's lie, just briefer.
  if (shareUrl) {
    const revoking = state === "revoking";
    return (
      <div className="flex flex-col gap-2 rounded-[13px] border border-line bg-elev p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-dim">{shareUrl}</code>
          <Button type="button" variant="secondary" size="sm" onClick={copy} disabled={revoking}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={revoke} disabled={revoking}>
            {revoking ? "Revoking…" : "Revoke"}
          </Button>
        </div>
        {error ? (
          <span role="alert" className="font-sans text-xs text-ro">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="secondary" size="sm" onClick={create} disabled={state === "busy"}>
        {state === "busy" ? "Creating link…" : "Copy public link"}
      </Button>
      {error ? (
        <span role="alert" className="font-sans text-xs text-ro">
          {error}
        </span>
      ) : null}
    </div>
  );
}
