import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser } }) }));

import { proxy } from "../proxy";

// `@/lib/supabase/config` is deliberately NOT mocked here: F10 is a bug about
// what happens when its env vars are *missing*, so the tests drive the real
// module through the environment instead of stubbing the answer.
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function request(path: string) {
  return new NextRequest(new URL(path, "http://lyra.test"));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  vi.restoreAllMocks();
  getUser.mockReset();
});

describe("proxy", () => {
  it("passes every request through untouched when Supabase isn't configured, instead of crashing (F10)", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // The public landing page and the waitlist route — neither needs a
    // session at all, which is exactly what made this a full-site outage:
    // a missing env var took down pages that require no auth.
    for (const path of ["/", "/api/waitlist", "/login"]) {
      const response = await proxy(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
    expect(getUser).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not redirect away from a protected page when Supabase isn't configured (F10)", async () => {
    // Failing soft means the page renders anonymously, not that it bounces to
    // `/login` — a redirect loop would be its own outage, and `authedFetch`
    // returns a clear 503 for the data the page then asks for.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await proxy(request("/feed"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still refreshes the session when Supabase is configured", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await proxy(request("/"));

    expect(getUser).toHaveBeenCalled();
  });

  it("redirects an anonymous visitor away from a protected page", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await proxy(request("/feed"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://lyra.test/login");
  });

  it("lets a signed-in visitor through to a protected page", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const response = await proxy(request("/feed"));

    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects an anonymous visitor away from a public page", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    for (const path of ["/", "/login", "/signup", "/share/abc123", "/analyze"]) {
      const response = await proxy(request(path));
      expect(response.headers.get("location")).toBeNull();
    }
  });
});
