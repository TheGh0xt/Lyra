import { describe, expect, it, vi } from "vitest";

import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  isTheme,
  resolveTheme,
} from "../theme";

describe("resolveTheme", () => {
  it.each([
    ["light", true, "light"],
    ["light", false, "light"],
    ["dark", false, "dark"],
    ["system", true, "dark"],
    ["system", false, "light"],
  ] as const)("resolves %s (prefersDark=%s) to %s", (theme, prefersDark, expected) => {
    expect(resolveTheme(theme, prefersDark)).toBe(expected);
  });
});

describe("isTheme", () => {
  it("rejects anything not in the union", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

/**
 * The inline script cannot import `resolveTheme`, so it restates the logic.
 * These run it for real against a fake window to pin the duplication — the
 * failure it prevents is a flash of the wrong theme on every navigation,
 * which is invisible to every other test in the suite.
 */
describe("THEME_INIT_SCRIPT", () => {
  function run(stored: string | null, prefersDark: boolean) {
    const attributes: Record<string, string> = {};
    const window = {
      localStorage: { getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null) },
      matchMedia: () => ({ matches: prefersDark }),
    };
    const document = {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attributes[name] = value;
        },
      },
    };
    new Function("window", "document", "localStorage", THEME_INIT_SCRIPT)(
      window,
      document,
      window.localStorage,
    );
    return attributes["data-theme"];
  }

  it("honours an explicit stored choice over the OS preference", () => {
    expect(run("light", true)).toBe("light");
    expect(run("dark", false)).toBe("dark");
  });

  it("follows the OS when the choice is system or absent", () => {
    expect(run("system", true)).toBe("dark");
    expect(run("system", false)).toBe("light");
    expect(run(null, true)).toBe("dark");
    expect(run(null, false)).toBe("light");
  });

  it("falls back to dark when storage throws", () => {
    const attributes: Record<string, string> = {};
    const window = {
      localStorage: {
        getItem: () => {
          throw new Error("storage disabled");
        },
      },
      matchMedia: () => ({ matches: false }),
    };
    const document = {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attributes[name] = value;
        },
      },
    };
    new Function("window", "document", "localStorage", THEME_INIT_SCRIPT)(
      window,
      document,
      window.localStorage,
    );
    expect(attributes["data-theme"]).toBe("dark");
  });

  it("never writes a theme the token sheet cannot style", () => {
    // globals.css has :root and [data-theme="light"] and nothing else.
    const written = [run("system", true), run("system", false), run("light", false), run("dark", true)];
    expect(new Set(written)).toEqual(new Set(["dark", "light"]));
    expect(vi.isMockFunction(run)).toBe(false);
  });
});
