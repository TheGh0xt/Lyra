// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { recallQuery, rememberQuery } from "../pendingQuery";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("pendingQuery", () => {
  it("recalls a remembered query by analysis id", () => {
    rememberQuery("a1", "world-cup-winner");
    expect(recallQuery("a1")).toBe("world-cup-winner");
  });

  it("returns null for an id nothing remembered", () => {
    expect(recallQuery("unknown")).toBeNull();
  });

  it("keeps different analyses separate", () => {
    rememberQuery("a1", "first query");
    rememberQuery("a2", "second query");
    expect(recallQuery("a1")).toBe("first query");
    expect(recallQuery("a2")).toBe("second query");
  });
});
