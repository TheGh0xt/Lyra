import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

/**
 * The warm ping's entire contract is that it cannot hurt anything.
 *
 * It fires on the landing page and every auth screen, for visitors who did
 * not ask for it and cannot act on its result — so the cases worth pinning
 * are the failures, not the happy path. A warm route that propagates a
 * backend outage to the landing page is worse than no warm route.
 */
describe("GET /api/warm", () => {
  beforeEach(() => {
    vi.stubEnv("CYGNUS_API_URL", "https://cygnus.test");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("pings Cygnus's unauthenticated readiness endpoint", async () => {
    // /v1/ready specifically: it needs no session (the visitor has none yet
    // on the landing page) and it is cheap, so the only real work it causes
    // is the container boot we are after.
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await GET();

    expect(fetch).toHaveBeenCalledWith(
      "https://cygnus.test/v1/ready",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns 204 when Cygnus is unreachable", async () => {
    // The visitor is on a page that does not need the backend. Surfacing
    // this would be noise, and the screens that do need it report their own
    // failures properly.
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET();

    expect(response.status).toBe(204);
  });

  it("returns 204 when the ping times out", async () => {
    // A timeout is the *expected* outcome against a cold container, and it
    // is a success: Render began the boot the moment the request landed.
    // Waiting for the answer was never the point.
    vi.mocked(fetch).mockRejectedValue(
      Object.assign(new Error("The operation was aborted due to timeout"), {
        name: "TimeoutError",
      }),
    );

    const response = await GET();

    expect(response.status).toBe(204);
  });

  it("is never cached", async () => {
    // A cached 204 at the edge would mean later visitors never reach Cygnus
    // at all, which is precisely the wake-up this route exists to cause.
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not throw when CYGNUS_API_URL is missing entirely", async () => {
    // `cygnusUrl()` throws on a blank value. The landing page must render
    // regardless of how the environment is configured.
    vi.unstubAllEnvs();
    vi.stubEnv("CYGNUS_API_URL", "");
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await expect(GET()).resolves.toBeInstanceOf(Response);
  });
});
