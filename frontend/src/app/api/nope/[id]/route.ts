import { NextResponse } from "next/server";

import { getChallengeById } from "@/db/queries";

export async function GET(_request: Request, ctx: RouteContext<"/api/nope/[id]">) {
  const { id } = await ctx.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId)) {
    return NextResponse.json({ error: "Invalid nope id" }, { status: 400 });
  }

  const row = await getChallengeById(parsedId);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}
