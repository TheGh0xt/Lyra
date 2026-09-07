// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WaitlistForm } from "../WaitlistForm";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | (() => Response)) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () =>
      typeof response === "function" ? response() : response,
    ),
  );
}

describe("WaitlistForm", () => {
  it("rejects an invalid email before calling the network", async () => {
    stubFetch(new Response("{}", { status: 200 }));
    render(<WaitlistForm />);

    await userEvent.type(screen.getByLabelText("Email address"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the position on success", async () => {
    stubFetch(
      new Response(JSON.stringify({ already_registered: false, position: 7 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<WaitlistForm />);

    await userEvent.type(screen.getByLabelText("Email address"), "a@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(await screen.findByRole("status")).toHaveTextContent("position #7");
  });

  it("tells an already-registered visitor plainly, not as an error", async () => {
    stubFetch(
      new Response(JSON.stringify({ already_registered: true, position: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    render(<WaitlistForm />);

    await userEvent.type(screen.getByLabelText("Email address"), "a@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(await screen.findByRole("status")).toHaveTextContent("already on the waitlist");
  });

  it("degrades gracefully when the endpoint is a 501 stub", async () => {
    stubFetch(new Response(null, { status: 501 }));
    render(<WaitlistForm />);

    await userEvent.type(screen.getByLabelText("Email address"), "a@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Sign-ups open shortly");
    // Must not read as a failure — no alert role, no "error"/"wrong" wording.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a calm error when the network call itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<WaitlistForm />);

    await userEvent.type(screen.getByLabelText("Email address"), "a@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the waitlist");
  });

  it("disables the control while submitting", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r))),
    );
    render(<WaitlistForm />);

    await userEvent.type(screen.getByLabelText("Email address"), "a@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(screen.getByRole("button", { name: "Joining…" })).toBeDisabled();
    resolve(
      new Response(JSON.stringify({ already_registered: false, position: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });
});
