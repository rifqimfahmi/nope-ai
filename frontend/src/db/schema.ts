import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  input: text("input").notNull(),
  reply: text("reply").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
