import { NextResponse } from "next/server";
import { z } from "zod";

import { isRateLimited } from "@/lib/rate-limit";
import { challengeRequestSchema } from "@/lib/schemas";

const FASTAPI_URL = process.env.FASTAPI_URL;

// Proxies to the FastAPI service so the browser only ever talks to this origin -
// FastAPI is an internal upstream, not exposed to the client. Streams the
// response straight through rather than re-parsing/re-serializing it.
export const dynamic = "force-dynamic";

// Best-effort client IP: trust the first hop's x-forwarded-for since this
// only ever sits behind our own reverse proxy/tunnel, never directly on the internet.
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (!FASTAPI_URL) {
    return NextResponse.json({ error: "FASTAPI_URL is not set" }, { status: 500 });
  }

  if (isRateLimited(getClientIp(request))) {
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

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
