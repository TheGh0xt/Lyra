import { describe, expect, it } from "vitest";
import type { InterestCategory } from "@/lib/api/client";
import { MAX_INTERESTS, MIN_INTERESTS, defaultSelection, toggleCategory } from "../selection";

const categories: InterestCategory[] = [
  { slug: "politics", label: "Politics", sort_order: 0 },
  { slug: "crypto", label: "Crypto", sort_order: 1 },
  { slug: "ai", label: "AI", sort_order: 2 },
  { slug: "sports", label: "Sports", sort_order: 3 },
  { slug: "health", label: "Health", sort_order: 4 },
];

describe("toggleCategory", () => {
  it("adds a category that isn't selected yet", () => {
    expect(toggleCategory(["crypto"], "ai")).toEqual(["crypto", "ai"]);
  });

  it("removes a category that's already selected", () => {
    expect(toggleCategory(["crypto", "ai"], "ai")).toEqual(["crypto"]);
  });

  it("refuses to add a sixth category", () => {
    const five = ["politics", "crypto", "ai", "sports", "health"];
    expect(toggleCategory(five, "elections")).toEqual(five);
  });

  it("always allows removing, even from the max", () => {
    const five = ["politics", "crypto", "ai", "sports", "health"];
    expect(toggleCategory(five, "health")).toEqual(["politics", "crypto", "ai", "sports"]);
  });
});

describe("defaultSelection", () => {
  it("picks the first MIN_INTERESTS categories by sort order", () => {
    const shuffled = [categories[3], categories[0], categories[4], categories[1], categories[2]];
    expect(defaultSelection(shuffled)).toEqual(["politics", "crypto", "ai"]);
  });

  it("returns everything available when there are fewer than the minimum", () => {
    expect(defaultSelection(categories.slice(0, 2))).toEqual(["politics", "crypto"]);
  });
});

describe("constraints", () => {
  it("are 3 and 5 per the frozen contract", () => {
    expect(MIN_INTERESTS).toBe(3);
    expect(MAX_INTERESTS).toBe(5);
  });
});
