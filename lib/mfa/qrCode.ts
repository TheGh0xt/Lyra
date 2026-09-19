import QRCode from "qrcode";

/**
 * Renders a TOTP `otpauth://` URI as an inline SVG string (F13).
 *
 * SVG, not a PNG data URI: `qrcode`'s raster output (`toDataURL`) needs a
 * real `<canvas>`, which jsdom doesn't implement, and the setup key never
 * leaves the browser either way — no third-party QR image API, which would
 * mean sending the TOTP secret embedded in this URI to someone else's
 * server. The SVG renderer is pure string generation, so it works
 * identically in the browser and in tests.
 */
export function generateQrSvg(otpauthUri: string): Promise<string> {
  return QRCode.toString(otpauthUri, { type: "svg", margin: 1, width: 200 });
}
