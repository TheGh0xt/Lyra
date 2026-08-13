import type { SseEventName } from "./stages";

export type Frame = {
  event: SseEventName;
  stage: string | null;
  data: unknown;
};

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

/** Reads an SSE response body, invoking `onFrame` as frames complete. */
export async function consumeStream(
  url: string,
  onFrame: (frame: Frame) => void,
): Promise<void> {
  const response = await fetch(url, {
    headers: { accept: "text/event-stream" },
  });
  if (!response.body) throw new Error("no stream body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { frames, rest } = drainFrames(buffer);
    buffer = rest;
    for (const frame of frames) onFrame(frame);
  }
}
