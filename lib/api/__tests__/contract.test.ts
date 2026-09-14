import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * openapi.json is copied from Cygnus, never edited here. Cygnus writes the
 * same digest into its own contract.sha256, so both repos pin one value: a
 * contract change that reaches only one repo fails that repo's CI.
 *
 * To sync: copy openapi.json and contract.sha256 from Cygnus main, then run
 * `npm run generate:api`.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));

describe("frozen contract", () => {
  it("openapi.json matches the digest pinned in contract.sha256", () => {
    const digest = createHash("sha256")
      .update(readFileSync(`${root}openapi.json`))
      .digest("hex");
    const pinned = readFileSync(`${root}contract.sha256`, "utf8").trim();
    expect(digest).toBe(pinned);
  });
});
