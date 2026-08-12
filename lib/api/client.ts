import type { components } from "./schema";

/**
 * Types for the Cygnus API.
 *
 * These come from `schema.d.ts`, generated from `openapi.json` — never
 * hand-edit either. Run `npm run generate:api` after the contract changes;
 * CI fails if the checked-in types have drifted.
 */

export type MarketAnalysisReport = components["schemas"]["MarketAnalysisReport"];
export type CausalDriver = components["schemas"]["CausalDriver"];
export type KeyDriver = components["schemas"]["KeyDriver"];
export type Impact = components["schemas"]["Impact"];
export type AnalysisResult = components["schemas"]["AnalysisResult"];
export type AnalysisCreated = components["schemas"]["AnalysisCreated"];

/**
 * Base URL of the Cygnus API. Server-side only.
 *
 * Deliberately not `NEXT_PUBLIC_`: the browser talks to this app's own route
 * handlers, which proxy to Cygnus. That keeps the API address — and any
 * future auth header — out of the client bundle. The browser never reaches
 * Gemini, MCP, or Sagittarius.
 */
export function cygnusUrl(): string {
  return process.env.CYGNUS_API_URL ?? "http://127.0.0.1:8000";
}

/** RFC 9457 problem+json, as returned by every Cygnus error path. */
export type Problem = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string | null;
  request_id?: string | null;
};

/**
 * Human-readable copy per problem type.
 *
 * Keyed on the stable slug at the end of the `type` URI — never on `title`
 * or `detail`, which the server is free to reword without notice.
 */
const PROBLEM_COPY: Record<string, string> = {
  "sagittarius-unavailable":
    "The market data service is unreachable, so this analysis can't gather evidence. Try again shortly.",
  "event-not-found":
    "No Polymarket event matched that slug. Check the URL or slug and try again.",
  "model-error":
    "The reasoning model couldn't complete this analysis. This is usually temporary.",
  "rate-limited": "Too many requests. Wait a moment before trying again.",
  "quota-exceeded": "You've used the analyses available to you for now.",
  "invalid-request": "That request couldn't be understood.",
  "analysis-not-found": "That analysis no longer exists. Start a new one.",
  "internal-error": "Something went wrong on our side.",
};

export function problemSlug(problem: Problem): string {
  return problem.type.split("/").pop() ?? "";
}

export function describeProblem(problem: Problem | null): string {
  if (!problem) return "Something went wrong.";
  return PROBLEM_COPY[problemSlug(problem)] ?? problem.detail ?? problem.title;
}

export function isProblem(value: unknown): value is Problem {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "status" in value &&
    "title" in value
  );
}
