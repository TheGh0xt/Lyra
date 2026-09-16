import { describe, expect, it } from "vitest";
import { formatDelta, formatProbability, formatVolume } from "../format";

describe("formatProbability", () => {
  it("renders a 0-1 fraction as a whole percent", () => {
    expect(formatProbability(0.63)).toBe("63%");
    expect(formatProbability(0)).toBe("0%");
    expect(formatProbability(1)).toBe("100%");
  });

  it("rounds rather than truncating", () => {
    expect(formatProbability(0.635)).toBe("64%");
  });
});

describe("formatDelta", () => {
  it("shows a positive move with an up arrow and a plus sign", () => {
    expect(formatDelta(0.22)).toEqual({ text: "▲ +22", tone: "positive" });
  });

  it("shows a negative move with a down arrow and no double sign", () => {
    expect(formatDelta(-0.11)).toEqual({ text: "▽ -11", tone: "negative" });
  });

  it("treats exactly zero as flat, not positive", () => {
    expect(formatDelta(0)).toEqual({ text: "◆ 0", tone: "neutral" });
  });
});

describe("formatVolume", () => {
  it("compacts millions", () => {
    expect(formatVolume(1_840_000)).toBe("$1.84M");
  });

  it("compacts thousands", () => {
    expect(formatVolume(4_480)).toBe("$4.48K");
  });

  it("leaves small amounts as whole dollars", () => {
    expect(formatVolume(842)).toBe("$842");
  });
});
