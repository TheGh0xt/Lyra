import { afterEach, describe, expect, it } from "vitest";
import { cygnusUrl } from "../client";

const ENV_KEYS = ["CYGNUS_API_URL", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;
const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("cygnusUrl", () => {
  it("defaults to the local dev server when unset", () => {
    delete process.env.CYGNUS_API_URL;
    expect(cygnusUrl()).toBe("http://127.0.0.1:8000");
  });

  it("returns a configured value as-is", () => {
    process.env.CYGNUS_API_URL = "https://cygnus.internal";
    expect(cygnusUrl()).toBe("https://cygnus.internal");
  });

  it("strips a trailing slash", () => {
    process.env.CYGNUS_API_URL = "https://cygnus.internal/";
    expect(cygnusUrl()).toBe("https://cygnus.internal");
  });

  it("fails loud on a blank value instead of silently using a relative path", () => {
    process.env.CYGNUS_API_URL = "";
    expect(() => cygnusUrl()).toThrow(/blank/i);
  });

  it("fails loud on a whitespace-only value", () => {
    process.env.CYGNUS_API_URL = "   ";
    expect(() => cygnusUrl()).toThrow(/blank/i);
  });

  it("fails loud on a syntactically invalid URL", () => {
    process.env.CYGNUS_API_URL = "cygnus.internal:8000";
    expect(() => cygnusUrl()).toThrow(/not a valid URL/i);
  });

  it("fails loud when the value resolves to this app's own Vercel deployment host", () => {
    process.env.VERCEL_URL = "vegaintel-git-main.vercel.app";
    process.env.CYGNUS_API_URL = "https://vegaintel-git-main.vercel.app";
    expect(() => cygnusUrl()).toThrow(/own host/i);
  });

  it("fails loud when the value resolves to this app's production Vercel host", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "vegaintel.vercel.app";
    process.env.CYGNUS_API_URL = "https://vegaintel.vercel.app";
    expect(() => cygnusUrl()).toThrow(/own host/i);
  });

  it("is case-insensitive when matching the app's own host", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "vegaintel.vercel.app";
    process.env.CYGNUS_API_URL = "https://VegaIntel.Vercel.App";
    expect(() => cygnusUrl()).toThrow(/own host/i);
  });

  it("allows a value that merely shares a suffix with the app's own host", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "vegaintel.vercel.app";
    process.env.CYGNUS_API_URL = "https://cygnus.vegaintel.vercel.app";
    expect(cygnusUrl()).toBe("https://cygnus.vegaintel.vercel.app");
  });
});
