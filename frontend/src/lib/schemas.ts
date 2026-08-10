import { z } from "zod";

export const challengeRequestSchema = z.object({
  input: z.string().trim().min(1, "Say something first."),
});

export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;

const phaseContentSchema = z.enum(["generating", "reviewing"]);

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("phase"), content: phaseContentSchema, timestamp: z.number() }),
  z.object({ type: z.literal("token"), content: z.string(), timestamp: z.number() }),
  z.object({ type: z.literal("complete"), content: z.string(), timestamp: z.number() }),
  z.object({ type: z.literal("error"), content: z.string(), timestamp: z.number() }),
]);

export type StreamEvent = z.infer<typeof streamEventSchema>;
export type Phase = z.infer<typeof phaseContentSchema>;

export const historyItemSchema = z.object({
  id: z.number(),
  input: z.string(),
  reply: z.string(),
  createdAt: z.string(),
});

export type HistoryItem = z.infer<typeof historyItemSchema>;

export const createHistoryItemSchema = z.object({
  input: z.string().trim().min(1),
  reply: z.string().trim().min(1),
});

export type CreateHistoryItem = z.infer<typeof createHistoryItemSchema>;
