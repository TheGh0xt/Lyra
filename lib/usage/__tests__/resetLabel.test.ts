import { describe, expect, it } from "vitest";
import { nextResetLabel } from "../resetLabel";

describe("nextResetLabel", () => {
  it("is the 1st of next month within a year", () => {
    expect(nextResetLabel(new Date(Date.UTC(2026, 7, 14)))).toBe("1 September 2026");
  });

  it("rolls over the year in December", () => {
    expect(nextResetLabel(new Date(Date.UTC(2026, 11, 20)))).toBe("1 January 2027");
  });
});
