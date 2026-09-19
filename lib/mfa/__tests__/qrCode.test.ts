import { describe, expect, it } from "vitest";
import { generateQrSvg } from "../qrCode";

describe("generateQrSvg", () => {
  it("renders a real otpauth:// URI as inline SVG markup (F13)", async () => {
    const svg = await generateQrSvg("otpauth://totp/VegaIntel:a%40example.com?secret=ABC&issuer=VegaIntel");

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});
