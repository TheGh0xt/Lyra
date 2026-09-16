import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser } }) }));

import { proxy } from "../proxy";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function request(path: string) {
  return new NextRequest(new URL(path, "http://lyra.test"));
}

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  vi.restoreAllMocks();
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

  it("still refreshes the session when Supabase is configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    getUser.mockResolvedValue({ data: { user: null } });

    await proxy(request("/"));

    expect(getUser).toHaveBeenCalled();
  });
});
