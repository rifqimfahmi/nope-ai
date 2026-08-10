import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { challenges } from "@/db/schema";
import { createHistoryItemSchema } from "@/lib/schemas";

export async function GET() {
  const rows = await db.select().from(challenges).orderBy(desc(challenges.createdAt)).limit(50);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createHistoryItemSchema.safeParse(body);

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
