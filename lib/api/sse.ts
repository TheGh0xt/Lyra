import { describeProblem, isProblem } from "./client";
import type { SseEventName } from "./stages";

export type Frame = {
  event: SseEventName;
  stage: string | null;
  data: unknown;
};

/**
 * The stream could not be read to a conclusion.
 *
 * Deliberately distinct from an `error` *frame*: a frame means Cygnus ran the
 * analysis and it failed, which is a finished run. This means the pipe broke
 * while the run was probably still going — so callers route it to
 * "Lost connection / Check status", never to "Retry", which would spend
 * another of the user's five monthly analyses.
 */
export class SseStreamError extends Error {
  /** The upstream HTTP status, or null when the stream died mid-body. */
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "SseStreamError";
    this.status = status;
  }
}

/** A frame that ends the run. Cygnus emits exactly one, then closes. */
function isTerminal(frame: Frame): boolean {
  return frame.event === "report" || frame.event === "error";
}

/**
 * Best-effort human copy for a non-2xx, reusing the shared problem table so
 * this path words failures the same way every other screen does.
 */
async function describeFailure(response: Response): Promise<string> {
  try {
    const payload = JSON.parse(await response.text()) as unknown;
    if (isProblem(payload)) return describeProblem(payload);
  } catch {
    // Not JSON at all — Next's HTML 500 page, or a proxy's error page.
    // Fall through to the status, which is at least true.
  }
  return `The analysis stream failed (HTTP ${response.status}).`;
}

/**
 * Parses one SSE frame (the text between blank-line delimiters).
 *
 * Returns null for anything unparseable rather than throwing — a malformed
 * frame should not tear down a stream that is still delivering good ones.
 */
export function parseFrame(raw: string): Frame | null {
  let name: string | null = null;
  let data: string | null = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("event: ")) name = line.slice(7).trim();
    else if (line.startsWith("data: ")) data = line.slice(6);
  }
  if (!name || data === null) return null;

  try {
    const parsed = JSON.parse(data) as { stage?: string | null; data?: unknown };
    return {
      event: name as SseEventName,
      stage: parsed.stage ?? null,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

/**
 * Splits a buffer into complete frames, returning the unconsumed remainder.
 *
 * The remainder matters: a network chunk can end mid-frame, and parsing that
 * partial text would drop the event. Callers carry the remainder into the
 * next read.
 */
export function drainFrames(buffer: string): {
  frames: Frame[];
  rest: string;
} {
  const frames: Frame[] = [];
  let rest = buffer;

  let split = rest.indexOf("\n\n");
  while (split !== -1) {
    const frame = parseFrame(rest.slice(0, split));
    if (frame) frames.push(frame);
    rest = rest.slice(split + 2);
    split = rest.indexOf("\n\n");
  }
  return { frames, rest };
}

/**
 * Reads an SSE response body, invoking `onFrame` as frames complete.
 *
 * Resolves only when the run reached a conclusion — a `report` or an `error`
 * frame. Every other ending throws `SseStreamError`.
 *
 * That contract is the fix for LYR-02. The previous version checked neither
 * the status nor the ending, and a non-2xx still has a body: a 401's
 * problem+json was decoded as SSE text, `drainFrames` found no `\n\n`, zero
 * frames were emitted, the reader reached `done`, and the function
 * *resolved*. The caller's `catch` never ran, so a token expiring mid-run
 * left "Working on it" and four grey stages on screen forever.
 *
 * Resolving only on a terminal frame is safe because Cygnus guarantees one:
 * `pipeline.py` publishes `report` or `error` and closes the queue in a
 * `finally`. So a stream that stops after stage events was cut in transit —
 * a function timeout, a dropped connection, a restart — and is never a run
 * that quietly succeeded.
 */
export async function consumeStream(
  url: string,
  onFrame: (frame: Frame) => void,
): Promise<void> {
  const response = await fetch(url, {
    headers: { accept: "text/event-stream" },
  });

  if (!response.ok) {
    throw new SseStreamError(await describeFailure(response), response.status);
  }
  if (!response.body) {
    throw new SseStreamError("The analysis stream returned no body.", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminal = false;

  const emit = (frames: Frame[]) => {
    for (const frame of frames) {
      if (isTerminal(frame)) sawTerminal = true;
      onFrame(frame);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { frames, rest } = drainFrames(buffer);
    buffer = rest;
    emit(frames);
  }

  // Flush whatever the decoder still holds and parse any tail that arrived
  // without its closing blank line. Without this, a truncated final frame is
  // dropped and then reported as a premature end — turning a report that did
  // arrive into "connection lost".
  buffer += decoder.decode();
  if (buffer.trim()) {
    const tail = parseFrame(buffer);
    if (tail) emit([tail]);
  }

  if (!sawTerminal) {
    throw new SseStreamError(
      "The connection to this run ended before it finished.",
    );
  }
}
