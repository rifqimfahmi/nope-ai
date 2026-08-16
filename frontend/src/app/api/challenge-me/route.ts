import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { recordRateLimitHit } from "@/db/queries";
import { challenges } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";
import { challengeRequestSchema } from "@/lib/schemas";

const FASTAPI_URL = process.env.FASTAPI_URL;

// Proxies to the FastAPI service so the browser only ever talks to this origin -
// FastAPI is an internal upstream, not exposed to the client.
export const dynamic = "force-dynamic";

// Best-effort client IP: trust the first hop's x-forwarded-for since this
// only ever sits behind our own reverse proxy/tunnel, never directly on the internet.
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

interface CompleteEvent {
  type: "complete";
  content: string;
  timestamp: number;
  cost?: number;
}

function isCompleteEvent(value: unknown): value is CompleteEvent {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "complete" &&
    typeof (value as { content?: unknown }).content === "string"
  );
}

// Parses one "data: {...}" SSE frame's JSON payload the same way lib/api/challenge.ts does client-side.
function parseSseFrame(frame: string): unknown {
  const dataLines = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  if (dataLines.length === 0) return null;

  try {
    return JSON.parse(dataLines.join("\n"));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!FASTAPI_URL) {
    return NextResponse.json({ error: "FASTAPI_URL is not set" }, { status: 500 });
  }

  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp)) {
    await recordRateLimitHit(clientIp);
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json();
  const parsed = challengeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const upstream = await fetch(`${FASTAPI_URL}/challenge-me`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream challenge-me request failed with status ${upstream.status}` },
      { status: 502 },
    );
  }

  const userInput = parsed.data.input;
  const upstreamReader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Parses the upstream SSE stream so the "complete" event can be persisted
  // server-side (never trusting a client-supplied reply, see /api/nope) before
  // forwarding every event straight through to the browser.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;

          // sse_starlette terminates lines with CRLF; normalize to LF so the
          // "\n\n" event boundary and per-line "data:" splitting stay correct.
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

          let boundary: number;
          while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            const payload = parseSseFrame(frame);

            if (isCompleteEvent(payload)) {
              const [row] = await db
                .insert(challenges)
                .values({ input: userInput, reply: payload.content, cost: payload.cost })
                .returning();

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ ...payload, id: row.id })}\n\n`),
              );
              continue;
            }

            controller.enqueue(encoder.encode(`${frame}\n\n`));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      upstreamReader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
