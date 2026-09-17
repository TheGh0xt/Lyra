import type { UiMode } from "@/lib/api/client";

/**
 * Product telemetry (B.19) — mode switches and analysis starts, both go to
 * `POST /v1/events`.
 *
 * Best-effort by design: a dropped telemetry call is never worth failing,
 * blocking, or even surfacing to the user over — these functions never
 * throw and their return value is never awaited by a caller that cares
 * about the result. `ui_mode_switched` is also how `ui_mode` gets
 * persisted on the profile — Cygnus's handler writes it whenever
 * `name === "ui_mode_switched"` and `ui_mode` is set; there's no separate
 * "set my UI mode" endpoint.
 */
async function sendEvent(name: string, uiMode: UiMode): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, ui_mode: uiMode }),
    });
  } catch {
    // Best-effort — see the module docstring.
  }
}

export function recordUiModeSwitch(mode: UiMode): Promise<void> {
  return sendEvent("ui_mode_switched", mode);
}

/** Tags which mode a run was launched from — "switches and runs" per the brief. */
export function recordAnalysisStarted(mode: UiMode): Promise<void> {
  return sendEvent("analysis_started", mode);
}
