// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "../theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/ui/theme";

/*
 * Both browser APIs the toggle reads have to be supplied by hand.
 *
 * jsdom has never implemented matchMedia. localStorage is the surprising one:
 * under Node 26 it is absent here too — Node ships its own localStorage gated
 * behind --localstorage-file, and jsdom's does not survive into the Vitest
 * environment. Stubbing both keeps the test honest about what it controls.
 */
function stubEnvironment({ prefersDark = false, storage = true } = {}) {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (!storage) throw new Error("storage disabled");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (!storage) throw new Error("storage disabled");
      store.set(key, value);
    },
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: prefersDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
  return store;
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeToggle", () => {
  it("follows the OS when nothing is stored", () => {
    stubEnvironment({ prefersDark: true });
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
  });

  it("prefers an explicit stored choice over the OS", () => {
    const store = stubEnvironment({ prefersDark: true });
    store.set(THEME_STORAGE_KEY, "light");
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("persists the switch and repaints <html>", async () => {
    const store = stubEnvironment({ prefersDark: true });
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    expect(store.get(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("ignores a stored value the token sheet cannot style", () => {
    const store = stubEnvironment({ prefersDark: false });
    store.set(THEME_STORAGE_KEY, "sepia");
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("still switches when storage is unavailable", async () => {
    stubEnvironment({ prefersDark: true, storage: false });
    render(<ThemeToggle />);
    // Private browsing must not turn the toggle into a dead button. The DOM
    // still repaints; only the persistence is lost.
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
