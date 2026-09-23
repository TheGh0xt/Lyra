import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UX-06, the class rather than the instance.
 *
 * Two screens told the user to change something "from settings" / "in
 * settings" — and there is no `/settings` route in the app, never has been.
 * The MFA copy was the sharpest case: it pointed at a screen that does not
 * exist to do the one thing the user was asking how to do.
 *
 * Copy that names a destination is a promise. This fails if any shipped copy
 * points at a settings screen while none is routable, so the promise cannot
 * be re-added without either building it or rewording. Delete this test the
 * day `app/settings/page.tsx` lands.
 */

const ROOTS = ["app", "components"];
const PROMISE = /\b(?:in|from|under|via)\s+settings\b/i;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

describe("user-facing copy", () => {
  it("does not send the user to a settings screen that does not exist", () => {
    const routable = sourceFiles("app").some((f) => /app\/settings\/page\.tsx$/.test(f));
    if (routable) return;

    const offenders = ROOTS.flatMap(sourceFiles).filter((file) =>
      PROMISE.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
