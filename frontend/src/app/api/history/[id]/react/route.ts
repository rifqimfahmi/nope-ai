import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { challenges } from "@/db/schema";

export async function POST(_request: Request, ctx: RouteContext<"/api/history/[id]/react">) {
  const { id } = await ctx.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId)) {
    return NextResponse.json({ error: "Invalid history id" }, { status: 400 });
  }

  const [row] = await db
    .update(challenges)
    .set({ reactions: sql`${challenges.reactions} + 1` })
    .where(eq(challenges.id, parsedId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}
