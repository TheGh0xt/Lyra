/**
 * Theme selection, kept deliberately small.
 *
 * Three states, matching what a user can actually mean: "light", "dark", or
 * "system" (follow the OS). Only the first two are ever written to the DOM —
 * `resolveTheme` collapses "system" against a media query — because the token
 * sheet keys off `[data-theme="light"]` and has no third branch.
 *
 * Beta stores the preference in localStorage. B.19 moves it onto the profile
 * and logs switches to `user_events`; the storage key stays the fallback for
 * signed-out visitors, so it is exported rather than inlined.
 */

export const THEME_STORAGE_KEY = "pmie-theme";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

/** What actually gets stamped on <html data-theme>. */
export type ResolvedTheme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

/**
 * Runs before first paint, inlined into <head>, so the page never renders in
 * the wrong theme and flips. It duplicates `resolveTheme` on purpose: this
 * string cannot import anything, and a flash of the wrong theme is the one
 * bug users notice on every single navigation.
 *
 * Pinned by a test that evaluates it against a fake document — see
 * `__tests__/theme.test.ts`.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=window.matchMedia("(prefers-color-scheme: dark)").matches;
var t=(s==="light"||s==="dark")?s:(d?"dark":"light");
document.documentElement.setAttribute("data-theme",t);
}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;
