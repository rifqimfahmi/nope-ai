import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { challenges } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";
import { challengeApiRequestSchema } from "@/lib/schemas";

const FASTAPI_URL = process.env.FASTAPI_URL;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Legit bodies are a few hundred bytes of JSON (input is capped to
// CHALLENGE_INPUT_MAX_LENGTH chars); this just stops multi-MB payloads from
// being fully buffered before Zod ever gets to reject them.
const MAX_BODY_BYTES = 10_000;

// Proxies to the FastAPI service so the browser only ever talks to this origin -
// FastAPI is an internal upstream, not exposed to the client.
export const dynamic = "force-dynamic";

// Number of trusted reverse-proxy/tunnel hops in front of this server (see
// docker-compose.prod.yml - "never directly on the internet"). x-forwarded-for
// is a comma-separated list that each hop *appends* to, so the last
// TRUSTED_PROXY_HOPS entries are ones our own infra actually observed; anything
// before that is client-supplied and trivially spoofable. Bump the env var if
// another trusted proxy/CDN is ever added in front of the existing tunnel.
const TRUSTED_PROXY_HOPS = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";

  const hops = forwardedFor.split(",").map((ip) => ip.trim());
  return hops[hops.length - TRUSTED_PROXY_HOPS] || "unknown";
}

type BodyReadResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" };

// Reads the request body under a byte cap instead of `request.json()`, which
// buffers the whole body (however large) before Zod gets a chance to reject it.
async function readJsonBody(request: Request, maxBytes: number): Promise<BodyReadResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, reason: "invalid_json" };

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
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

// Verifies a Turnstile token server-side (client-side widget completion alone
// proves nothing - it's just a DOM callback firing). remoteIp is the same
// trusted IP the rate limiter uses, passed through so Cloudflare can factor it
// into its verdict.
async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY!,
      response: token,
      remoteip: remoteIp,
    }),
  });

  if (!response.ok) return false;

  const result = (await response.json()) as { success?: unknown };
  return result.success === true;
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

  if (!TURNSTILE_SECRET_KEY) {
    return NextResponse.json({ error: "TURNSTILE_SECRET_KEY is not set" }, { status: 500 });
  }

  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.reason === "too_large" ? "Request body too large." : "Invalid JSON body." },
      { status: bodyResult.reason === "too_large" ? 413 : 400 },
    );
  }

  const parsed = challengeApiRequestSchema.safeParse(bodyResult.data);

  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const verified = await verifyTurnstileToken(parsed.data.turnstileToken, clientIp);
  if (!verified) {
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 403 },
    );
  }

  const upstream = await fetch(`${FASTAPI_URL}/challenge-me`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: parsed.data.input }),
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
