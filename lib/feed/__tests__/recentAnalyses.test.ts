// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { loadRecentAnalyses, MAX_RECENT_ANALYSES, pushRecentAnalysis } from "../recentAnalyses";

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
