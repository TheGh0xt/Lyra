import { describe, expect, it } from "vitest";
import { STAGES } from "@/lib/api/stages";
import { TERMINAL_STAGE_LABEL, TERMINAL_STAGE_NOTE } from "../stageLabels";

describe("TERMINAL_STAGE_LABEL / TERMINAL_STAGE_NOTE", () => {
  it("covers exactly the real four pipeline stages — no invented fifth or sixth stage", () => {
    // The mockup shows six (INGEST/SOURCES/XCHECK/PRICEMODEL/CONFIDENCE/
    // COMPOSE); the real SSE stream only ever has these four
    // (lib/api/stages.ts's STAGES, the frozen contract's own vocabulary).
    for (const stage of STAGES) {
      expect(TERMINAL_STAGE_LABEL[stage]).toBeTypeOf("string");
      expect(TERMINAL_STAGE_NOTE[stage]).toBeTypeOf("string");
    }
    expect(Object.keys(TERMINAL_STAGE_LABEL)).toHaveLength(STAGES.length);
  });
});
