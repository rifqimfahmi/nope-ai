import {
  challengeRequestSchema,
  streamEventSchema,
  type StreamEvent,
} from "@/lib/schemas";

function parseSseEvent(rawEvent: string): StreamEvent | null {
  const dataLines = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  if (dataLines.length === 0) return null;

  const parsed = streamEventSchema.safeParse(JSON.parse(dataLines.join("\n")));
  return parsed.success ? parsed.data : null;
}

/** Streams our own `/api/challenge-me` proxy (which forwards to the FastAPI service), yielding parsed SSE events as they arrive. */
export async function* streamChallenge(
  input: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await fetch("/api/challenge-me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(challengeRequestSchema.parse({ input })),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `challenge-me request failed with status ${response.status}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    let decodedChunk = decoder.decode(value, { stream: true });
    console.log({ decodedChunk });
    // sse_starlette terminates lines with CRLF; normalize to LF so the "\n\n"
    // event boundary and per-line "data:" splitting below both stay correct.
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const event = parseSseEvent(rawEvent);
      if (event) yield event;
    }
  }
}
