import Link from "next/link";
import { TERM } from "@/lib/ui/terminalPalette";

export type TerminalScreenName = "feed" | "run" | "report";

function tabStyle(active: boolean) {
  return {
    font: "inherit",
    fontSize: 12,
    letterSpacing: "0.08em",
    cursor: "pointer",
    background: "transparent",
    border: `1px solid ${active ? TERM.phosphor : "transparent"}`,
    color: active ? TERM.phosphor : TERM.textDim,
  } as const;
}

/*
 * UX-05. Padding and hit area live in classes, not in `tabStyle`, because an
 * inline style beats a class at every breakpoint — anything that has to
 * change with the viewport cannot be inline. The 44px floor on small screens
 * is the touch-target size; the desktop look is unchanged.
 */
const TAB_CLASS = "min-h-11 px-3 sm:min-h-0 sm:px-[11px] sm:py-1.5";
const CHROME_LINK_CLASS = "flex min-h-11 items-center px-3.5 sm:min-h-0";

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
    /*
     * UX-05. The bar already wrapped on a narrow screen, but wrapping in DOM
     * order put the ⌘K field and "EXIT TO CONVENTIONAL" on the same line and
     * clipped the ⌘K badge off the right edge. `order` re-sequences the rows
     * for small screens only — logo and exit, then the tabs, then the lookup
     * field full-width — so nothing moves on desktop.
     */
    <div
      className="flex flex-wrap items-stretch"
      style={{
        borderBottom: `1px solid ${TERM.border}`,
        background: TERM.bgHeader,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        // `mr-auto` below sm, so the two right-hand links share one row
        // rather than `ml-auto` on the first of them eating the free space
        // and wrapping the second onto a row of its own.
        className="order-1 mr-auto flex items-center gap-2.5 px-3.5 py-2.5 sm:order-1 sm:mr-0"
        style={{ borderRight: `1px solid ${TERM.border}` }}
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
        className="order-3 flex basis-full items-center gap-0.5 px-2 sm:order-2 sm:basis-auto"
        style={{ borderRight: `1px solid ${TERM.border}` }}
      >
        <button
          type="button"
          onClick={() => onNavigate("feed")}
          className={TAB_CLASS}
          style={tabStyle(screen === "feed")}
        >
          [1]&nbsp;FEED
        </button>
        <button
          type="button"
          onClick={() => onNavigate("run")}
          className={TAB_CLASS}
          style={tabStyle(screen === "run")}
        >
          [2]&nbsp;RUN
        </button>
        <button
          type="button"
          onClick={() => reportReady && onNavigate("report")}
          disabled={!reportReady}
          className={TAB_CLASS}
          style={{ ...tabStyle(screen === "report"), opacity: reportReady ? 1 : 0.4 }}
        >
          [3]&nbsp;REPORT
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenPalette}
        className="order-4 flex min-h-11 w-full grow items-center gap-2.5 px-3.5 sm:order-3 sm:min-h-0 sm:w-auto sm:min-w-[200px]"
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
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
      {/*
        #62 and #63 landed within minutes of each other and both touch this
        bar. Git merged them without a conflict, which is exactly why this
        needed looking at: an un-ordered flex child defaults to `order: 0`,
        which sorts *before* every `order-1..4` sibling — so SECURITY arrived
        on mobile ahead of the logo, in a bar whose whole point is that its
        rows are sequenced deliberately. It also missed the 44px touch target
        its EXIT sibling gets. Same treatment as EXIT now; they are the same
        kind of control.
      */}
      <Link
        href="/mfa"
        className={`order-2 sm:order-4 ${CHROME_LINK_CLASS}`}
        style={{
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
        // Same `order-2` as SECURITY, not the next number up: equal orders
        // fall back to DOM order, which already has SECURITY first. Giving
        // this `order-3` tied it with the tab group and sorted it *after*
        // that full-width row, stranding EXIT alone on a fourth line.
        className={`order-2 sm:order-5 ${CHROME_LINK_CLASS}`}
        style={{ fontSize: 11, color: TERM.textDim, letterSpacing: "0.1em" }}
        /*
         * The visible label shortens to "EXIT" on a phone, but "EXIT" alone
         * tells a screen reader user nothing about where it goes — so the
         * accessible name is pinned to the full phrase at every width.
         */
        aria-label="EXIT TO CONVENTIONAL"
      >
        EXIT<span className="hidden sm:inline">&nbsp;TO CONVENTIONAL</span>
      </Link>
    </div>
  );
}

export function TerminalFooter() {
  return (
    <div style={{ position: "sticky", bottom: 0, zIndex: 50, borderTop: `1px solid ${TERM.border}`, background: TERM.bgHeader }}>
      {/*
        UX-05. Hidden below `sm`, not restyled: these are keyboard shortcuts,
        and a phone has no keyboard to press them with. Wrapped, they took
        five lines of a ~700px viewport to advertise keys nobody on that
        device can use — and every one of them has a tappable equivalent in
        the header above. `aria-hidden` is deliberately absent; a screen
        reader user on a tablet may well have a keyboard.
      */}
      <div
        className="hidden flex-wrap items-center gap-4 px-3.5 py-1.5 sm:flex"
        style={{ fontSize: 11, color: TERM.textDim }}
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
