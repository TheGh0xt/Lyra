import Link from "next/link";
import { TERM } from "@/lib/ui/terminalPalette";

export type TerminalScreenName = "feed" | "run" | "report";

function tabStyle(active: boolean) {
  return {
    font: "inherit",
    fontSize: 12,
    letterSpacing: "0.08em",
    cursor: "pointer",
    padding: "6px 11px",
    background: "transparent",
    border: `1px solid ${active ? TERM.phosphor : "transparent"}`,
    color: active ? TERM.phosphor : TERM.textDim,
  } as const;
}

export function TerminalHeader({
  screen,
  reportReady,
  onNavigate,
  onOpenPalette,
  onExitToConventional,
}: {
  screen: TerminalScreenName;
  reportReady: boolean;
  onNavigate: (screen: TerminalScreenName) => void;
  onOpenPalette: () => void;
  onExitToConventional: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        borderBottom: `1px solid ${TERM.border}`,
        background: TERM.bgHeader,
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          borderRight: `1px solid ${TERM.border}`,
        }}
      >
        <Link
          href="/feed"
          style={{ color: TERM.phosphor, fontWeight: 700, letterSpacing: "0.22em", fontSize: 13 }}
        >
          VEGAINTEL
        </Link>
        <span style={{ color: TERM.textDim, fontSize: 11 }}>TERM</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 8px",
          borderRight: `1px solid ${TERM.border}`,
        }}
      >
        <button type="button" onClick={() => onNavigate("feed")} style={tabStyle(screen === "feed")}>
          [1]&nbsp;FEED
        </button>
        <button type="button" onClick={() => onNavigate("run")} style={tabStyle(screen === "run")}>
          [2]&nbsp;RUN
        </button>
        <button
          type="button"
          onClick={() => reportReady && onNavigate("report")}
          disabled={!reportReady}
          style={{ ...tabStyle(screen === "report"), opacity: reportReady ? 1 : 0.4 }}
        >
          [3]&nbsp;REPORT
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenPalette}
        style={{
          flex: "1 1 auto",
          minWidth: 200,
          whiteSpace: "nowrap",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          background: "transparent",
          border: 0,
          borderRight: `1px solid ${TERM.border}`,
          cursor: "text",
          font: "inherit",
          color: TERM.textDim,
          textAlign: "left",
        }}
      >
        <span style={{ color: TERM.phosphor }}>▸</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>market lookup / command</span>
        <span
          style={{
            marginLeft: "auto",
            flex: "0 0 auto",
            border: `1px solid ${TERM.border}`,
            padding: "2px 7px",
            fontSize: 11,
            color: TERM.textDim,
          }}
        >
          ⌘K
        </span>
      </button>
      {/*
        UX-06. Terminal mode reached exactly three screens, so a user here had
        no route to their account security at all — they had to know to leave
        the mode first. Parity in full is #48; this is the security control,
        which should not wait for it.
      */}
      <Link
        href="/mfa"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          fontSize: 11,
          color: TERM.textDim,
          letterSpacing: "0.1em",
          borderRight: `1px solid ${TERM.border}`,
        }}
      >
        SECURITY
      </Link>
      <Link
        href="/feed"
        onClick={onExitToConventional}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          fontSize: 11,
          color: TERM.textDim,
          letterSpacing: "0.1em",
        }}
      >
        EXIT TO CONVENTIONAL
      </Link>
    </div>
  );
}

export function TerminalFooter() {
  return (
    <div style={{ position: "sticky", bottom: 0, zIndex: 50, borderTop: `1px solid ${TERM.border}`, background: TERM.bgHeader }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "7px 14px",
          fontSize: 11,
          color: TERM.textDim,
          flexWrap: "wrap",
        }}
      >
        <span>[1] feed</span>
        <span>[2] run</span>
        <span>[3] report</span>
        <span>⌘K lookup</span>
        <span>ESC close</span>
        <span style={{ marginLeft: "auto", color: TERM.textDim }}>
          keyboard-first — every action here has a key
        </span>
      </div>
      <div
        style={{
          padding: "7px 14px",
          borderTop: `1px solid ${TERM.borderDim}`,
          fontSize: 11.5,
          color: "#A9B6AE",
        }}
      >
        <span style={{ color: TERM.amber }}>!</span> Research only. This explains what has already
        happened in a market. It is not a prediction, not a recommendation, and not financial
        advice. Confidence is capped at 0.90 and can be wrong.
      </div>
    </div>
  );
}
