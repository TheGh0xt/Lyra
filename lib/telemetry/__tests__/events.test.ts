import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAnalysisStarted, recordUiModeSwitch } from "../events";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("recordUiModeSwitch", () => {
  it("posts the switch with the ui_mode field Cygnus persists from", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await recordUiModeSwitch("TERMINAL");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "ui_mode_switched", ui_mode: "TERMINAL" }),
      }),
    );
  });

  it("never throws when the request fails — telemetry is best-effort", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(recordUiModeSwitch("CONVENTIONAL")).resolves.toBeUndefined();
  });

  it("never throws on a non-2xx response either", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 422 }));
    await expect(recordUiModeSwitch("CONVENTIONAL")).resolves.toBeUndefined();
  });
});

describe("recordAnalysisStarted", () => {
  it("tags which mode launched the run", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await recordAnalysisStarted("TERMINAL");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "analysis_started", ui_mode: "TERMINAL" }),
      }),
    );
  });

  it("never throws when the request fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(recordAnalysisStarted("CONVENTIONAL")).resolves.toBeUndefined();
  });
});
