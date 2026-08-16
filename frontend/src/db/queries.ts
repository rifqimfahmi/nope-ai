import { eq } from "drizzle-orm";

import { db } from "@/db";
import { challenges, rateLimitHits } from "@/db/schema";

export async function getChallengeById(id: number) {
  const [row] = await db.select().from(challenges).where(eq(challenges.id, id));
  return row;
}

export async function recordRateLimitHit(ip: string) {
  await db.insert(rateLimitHits).values({ ip });
}
