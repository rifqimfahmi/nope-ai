import { desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { challenges, rateLimitHits } from "@/db/schema";

const NOPES_PAGE_SIZE = 12;

export async function getChallengeById(id: number) {
  const [row] = await db.select().from(challenges).where(eq(challenges.id, id));
  return row;
}

export async function getRecentNopes(limit: number) {
  return db.select().from(challenges).orderBy(desc(challenges.createdAt)).limit(limit);
}

export async function getTopNopes(limit: number) {
  return db
    .select()
    .from(challenges)
    .orderBy(desc(challenges.reactions), desc(challenges.createdAt))
    .limit(limit);
}

export async function getNopesPage({ page, sort }: { page: number; sort: "new" | "top" }) {
  const orderBy =
    sort === "top"
      ? [desc(challenges.reactions), desc(challenges.createdAt)]
      : [desc(challenges.createdAt)];

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(challenges)
      .orderBy(...orderBy)
      .limit(NOPES_PAGE_SIZE)
      .offset((page - 1) * NOPES_PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(challenges),
  ]);

  return { items, total: count, pageSize: NOPES_PAGE_SIZE };
}

export async function getRelatedNopes(excludeId: number, limit: number) {
  return db
    .select()
    .from(challenges)
    .where(ne(challenges.id, excludeId))
    .orderBy(sql`random()`)
    .limit(limit);
}

export async function recordRateLimitHit(ip: string) {
  await db.insert(rateLimitHits).values({ ip });
}
