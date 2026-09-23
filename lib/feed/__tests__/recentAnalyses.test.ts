// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  formatWhen,
  loadRecentAnalyses,
  MAX_RECENT_ANALYSES,
  pushRecentAnalysis,
} from "../recentAnalyses";

afterEach(() => {
  window.localStorage.clear();
});

describe("recentAnalyses", () => {
  it("is empty with nothing stored", () => {
    expect(loadRecentAnalyses()).toEqual([]);
  });

  it("remembers a pushed entry, newest first", () => {
    pushRecentAnalysis({ id: "a1", question: "First?", when: "2026-09-15T00:00:00Z" });
    pushRecentAnalysis({ id: "a2", question: "Second?", when: "2026-09-16T00:00:00Z" });

    expect(loadRecentAnalyses().map((r) => r.id)).toEqual(["a2", "a1"]);
  });

  it("de-duplicates by id, moving a re-run to the front instead of listing it twice", () => {
    pushRecentAnalysis({ id: "a1", question: "First?", when: "2026-09-15T00:00:00Z" });
    pushRecentAnalysis({ id: "a2", question: "Second?", when: "2026-09-16T00:00:00Z" });
    pushRecentAnalysis({ id: "a1", question: "First? (re-run)", when: "2026-09-16T01:00:00Z" });

    const recents = loadRecentAnalyses();
    expect(recents.map((r) => r.id)).toEqual(["a1", "a2"]);
    expect(recents[0].question).toBe("First? (re-run)");
  });

  it(`caps the list at ${MAX_RECENT_ANALYSES}`, () => {
    for (let i = 0; i < MAX_RECENT_ANALYSES + 3; i++) {
      pushRecentAnalysis({ id: `a${i}`, question: `Q${i}`, when: "2026-09-16T00:00:00Z" });
    }
    expect(loadRecentAnalyses()).toHaveLength(MAX_RECENT_ANALYSES);
    expect(loadRecentAnalyses()[0].id).toBe(`a${MAX_RECENT_ANALYSES + 2}`);
  });

  it("degrades to an empty list rather than throwing when storage is corrupt", () => {
    window.localStorage.setItem("vegaintel:recent-analyses", "{not json");
    expect(loadRecentAnalyses()).toEqual([]);
  });
});

describe("recentAnalyses — shared across UI modes (UX-04)", () => {
  it("survives a malformed entry instead of taking the screen down", () => {
    // Entries are read back from storage some previous version of this code
    // wrote. A half-written or hand-edited row must not stop the history
    // screen rendering the rows either side of it.
    window.localStorage.setItem(
      "vegaintel:recent-analyses",
      JSON.stringify([
        { id: "good", question: "Fine?", when: "2026-09-16T00:00:00Z" },
        { id: "bad", question: 42 },
        null,
        "not an object",
      ]),
    );

    expect(loadRecentAnalyses().map((r) => r.id)).toEqual(["good"]);
  });

  it("keeps more than one month of runs", () => {
    // The free tier is five analyses a month. At the old cap of 5 the store
    // discarded everything older than a few weeks, on a product that
    // re-scores its reports at T+48h and promises they stay readable.
    expect(MAX_RECENT_ANALYSES).toBeGreaterThan(5);
  });
});

describe("formatWhen", () => {
  it("renders a stored timestamp as YYYY-MM-DD HH:MM", () => {
    expect(formatWhen("2026-09-16T11:04:33Z")).toBe("2026-09-16 11:04");
  });

  it("returns null rather than throwing on an unparseable value", () => {
    // LYR-04 was four crashes from an unguarded `new Date(x).toISOString()`,
    // which throws RangeError rather than returning something odd. A history
    // row with no timestamp beats a history screen that will not render.
    expect(formatWhen("")).toBeNull();
    expect(formatWhen("not a date at all")).toBeNull();
  });

  it("documents that V8 accepts some garbage as a real date", () => {
    // Measured, not assumed: `new Date("summer 2026")` does NOT produce an
    // Invalid Date in V8 — it silently yields 2025-12-31T23:00:00Z.
    //
    // This matters beyond this file. LYR-04 (#34) is written around the
    // crash case, but the lenient case is the more dangerous one: a
    // model-supplied `published_at` of "summer 2026" on a cited source
    // renders a confident, precise, wrong date on a report whose entire
    // pitch is that its evidence is dated and checkable. A guard that only
    // catches NaN will not catch this.
    //
    // Our own `when` values are always `new Date().toISOString()`, so this
    // cannot bite here — it is pinned so the next person to reuse
    // `formatWhen` for contract data knows what it does and does not cover.
    expect(formatWhen("summer 2026")).not.toBeNull();
  });
});
