"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { WaitlistResponse } from "@/lib/api/client";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "joined"; position: number | null }
  | { kind: "already-registered" }
  /** The `/v1/waitlist` stub hasn't landed on Cygnus yet — see B.1/B.15. */
  | { kind: "not-open" }
  | { kind: "error"; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The email-capture form for the landing page hero (UI_PRD §6.1.1).
 *
 * `/v1/waitlist` is a stub in the frozen contract — B.15's brief is explicit
 * that the UI must be built against the contract and degrade gracefully
 * until Cygnus lands the real logic. A 501 here is treated as "not open yet"
 * rather than an error: the visitor still gets an honest, calm response
 * instead of a scary failure message for something that isn't broken.
 */
export function WaitlistForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submitting = status.kind === "submitting";
  const settled =
    status.kind === "joined" ||
    status.kind === "already-registered" ||
    status.kind === "not-open";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (response.status === 501) {
        setStatus({ kind: "not-open" });
        return;
      }

      if (response.status === 422) {
        setFieldError("That doesn't look like a valid email address.");
        setStatus({ kind: "idle" });
        return;
      }

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: "Something went wrong. Try again in a moment.",
        });
        return;
      }

      const payload = (await response.json()) as WaitlistResponse;
      setStatus(
        payload.already_registered
          ? { kind: "already-registered" }
          : { kind: "joined", position: payload.position ?? null },
      );
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't reach the waitlist right now. Try again shortly.",
      });
    }
  }

  if (settled) {
    return (
      <div
        role="status"
        className={`flex items-center gap-2.5 rounded-[13px] border border-line-2 bg-elev px-[18px] py-4 font-sans text-sm text-text ${className ?? ""}`}
      >
        <span aria-hidden="true" className="text-violet-text">
          ✓
        </span>
        <span>
          {status.kind === "joined" &&
            (status.position
              ? `You're on the list — position #${status.position}.`
              : "You're on the list. We'll email you when your invite is ready.")}
          {status.kind === "already-registered" &&
            "That email is already on the waitlist."}
          {status.kind === "not-open" &&
            "Sign-ups open shortly — this page will start accepting them without any changes on your end."}
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className={`flex flex-col gap-3 sm:flex-row sm:items-start ${className ?? ""}`}
    >
      <div className="min-w-0 flex-1">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
          error={fieldError ?? undefined}
        />
      </div>
      <Button type="submit" disabled={submitting} className="shrink-0">
        {submitting ? "Joining…" : "Join the waitlist"}
      </Button>
      {status.kind === "error" ? (
        <p role="alert" className="basis-full font-sans text-xs text-ro">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
