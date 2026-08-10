import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { challenges } from "@/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/history/[id]">) {
  const { id } = await ctx.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId)) {
    return NextResponse.json({ error: "Invalid history id" }, { status: 400 });
  }

  const [row] = await db.select().from(challenges).where(eq(challenges.id, parsedId));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/history/[id]">) {
  const { id } = await ctx.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId)) {
    return NextResponse.json({ error: "Invalid history id" }, { status: 400 });
  }

  await db.delete(challenges).where(eq(challenges.id, parsedId));
  return new NextResponse(null, { status: 204 });
}
