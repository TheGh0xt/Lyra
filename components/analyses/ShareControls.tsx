"use client";

import { Button } from "@/components/ui";
import { useShareLink } from "@/lib/analyses/useShareLink";

/**
 * "Copy public link" / revoke (UI_PRD §6.7), conventional mode.
 *
 * All behaviour lives in `useShareLink`, shared with terminal mode's
 * `ShareLine` (UX-03). This file is markup only — if you are here to change
 * what happens on a failed revoke, the hook is the place.
 */
export function ShareControls({ analysisId }: { analysisId: string }) {
  const { state, shareUrl, error, copied, create, revoke, copy } = useShareLink(analysisId);

  // Keyed off `shareUrl`, not off `state === "created"`: while the DELETE is
  // in flight the state is "revoking", and falling through to the create-link
  // branch would show the link as already gone — LYR-05's lie, just briefer.
  if (shareUrl) {
    const revoking = state === "revoking";
    return (
      <div className="flex flex-col gap-2 rounded-[13px] border border-line bg-elev p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-dim">{shareUrl}</code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copy()}
            disabled={revoking}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void revoke()}
            disabled={revoking}
          >
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
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void create()}
        disabled={state === "creating"}
      >
        {state === "creating" ? "Creating link…" : "Copy public link"}
      </Button>
      {error ? (
        <span role="alert" className="font-sans text-xs text-ro">
          {error}
        </span>
      ) : null}
    </div>
  );
}
