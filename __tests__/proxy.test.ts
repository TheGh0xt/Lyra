import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/config", () => ({
  supabaseUrl: () => "https://test.supabase.co",
  supabaseAnonKey: () => "anon-key",
}));

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { proxy } from "../proxy";

function request(path: string) {
  return new NextRequest(new URL(path, "http://lyra.test"));
}

describe("proxy", () => {
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
