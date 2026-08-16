import { eq } from "drizzle-orm";

import { db } from "@/db";
import { challenges } from "@/db/schema";

export async function getChallengeById(id: number) {
  const [row] = await db.select().from(challenges).where(eq(challenges.id, id));
  return row;
}
