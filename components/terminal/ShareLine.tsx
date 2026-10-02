"use client";

import { TERM } from "@/lib/ui/terminalPalette";
import { useShareLink } from "@/lib/analyses/useShareLink";

const BUTTON_STYLE = {
  font: "inherit",
  fontSize: 12,
  background: "transparent",
  color: TERM.text,
  border: `1px solid ${TERM.border}`,
  padding: "7px 10px",
  cursor: "pointer",
} as const;

/* UX-05: every control in terminal mode carries a 44px touch floor below `sm`. */
const TAP_CLASS = "min-h-11 sm:min-h-0";

/**
 * Read-only share link for a terminal-mode report (UX-03).
 *
 * The named gap in Lyra#48: sharing existed in conventional mode only, so a
 * terminal user who wanted to send someone a report had to leave the mode to
 * do it. Behaviour is `useShareLink`, shared byte-for-byte with
 * `ShareControls` — including LYR-05's rule that a failed revoke must keep
 * the link on screen, because a link that is still live must never render as
 * gone. Only the markup differs.
 */
export function ShareLine({ analysisId }: { analysisId: string }) {
  const { state, shareUrl, error, copied, create, revoke, copy } = useShareLink(analysisId);
  const revoking = state === "revoking";

  return (
    <div style={{ borderTop: `1px solid ${TERM.border}`, padding: "12px 18px 16px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.18em", color: TERM.textDim, marginBottom: 8 }}>
        SHARE
      </div>

      {shareUrl ? (
        <div className="flex flex-col gap-2">
          <code
            className="block w-full overflow-x-auto"
            style={{ color: TERM.textBright, fontSize: 11.5, whiteSpace: "nowrap" }}
          >
            {shareUrl}
          </code>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              disabled={revoking}
              className={TAP_CLASS}
              style={BUTTON_STYLE}
            >
              {copied ? "COPIED" : "COPY LINK"}
            </button>
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={revoking}
              className={TAP_CLASS}
              style={{ ...BUTTON_STYLE, color: TERM.textDim }}
            >
              {revoking ? "REVOKING…" : "REVOKE"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void create()}
          disabled={state === "creating"}
          className={TAP_CLASS}
          style={BUTTON_STYLE}
        >
          {state === "creating" ? "CREATING LINK…" : "COPY PUBLIC LINK"}
        </button>
      )}

      {error ? (
        <p
          role="alert"
          style={{ color: TERM.red, fontSize: 11.5, lineHeight: 1.6, margin: "8px 0 0" }}
        >
          {error}
        </p>
      ) : null}

      <p style={{ color: TERM.textDim, fontSize: 11, lineHeight: 1.6, margin: "8px 0 0" }}>
        Anyone with the link can read this report. It carries the same disclaimer you see here.
      </p>
    </div>
  );
}
