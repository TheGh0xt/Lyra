"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { describeProblem, isProblem, type ShareTokenResponse } from "@/lib/api/client";

type State = "idle" | "busy" | "created" | "error";

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
      setError("Couldn't reach the server. Check your connection and try again.");
      setState("error");
    }
  }

  async function revoke() {
    setState("busy");
    try {
      await fetch(`/api/analyses/${analysisId}/share`, { method: "DELETE" });
    } finally {
      setShareUrl(null);
      setCopied(false);
      setState("idle");
    }
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

  if (state === "created" && shareUrl) {
    return (
      <div className="flex flex-col gap-2 rounded-[13px] border border-line bg-elev p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-dim">{shareUrl}</code>
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={revoke}>
            Revoke
          </Button>
        </div>
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
