import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { challenges } from "@/db/schema";
import { getRecentNopes, getTopNopes } from "@/db/queries";
import { createNopeSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 50);

  const rows =
    searchParams.get("sort") === "top" ? await getTopNopes(limit) : await getRecentNopes(limit);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createNopeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const [row] = await db.insert(challenges).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE() {
  await db.delete(challenges);
  return new NextResponse(null, { status: 204 });
}
