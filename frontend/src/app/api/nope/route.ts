import { NextResponse } from "next/server";

import { getRecentNopes, getTopNopes } from "@/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 50);

  const rows =
    searchParams.get("sort") === "top" ? await getTopNopes(limit) : await getRecentNopes(limit);

  return NextResponse.json(rows);
}
