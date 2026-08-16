import { z } from "zod";

export const challengeRequestSchema = z.object({
  input: z.string().trim().min(1, "Say something first."),
});

export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("phase"), content: z.string(), timestamp: z.number() }),
  z.object({ type: z.literal("token"), content: z.string(), timestamp: z.number() }),
  z.object({
    type: z.literal("complete"),
    content: z.string(),
    timestamp: z.number(),
    cost: z.number().optional(),
  }),
  z.object({ type: z.literal("error"), content: z.string(), timestamp: z.number() }),
]);

export type StreamEvent = z.infer<typeof streamEventSchema>;

export const nopeSchema = z.object({
  id: z.number(),
  input: z.string(),
  reply: z.string(),
  reactions: z.number(),
  createdAt: z.string(),
});

export type Nope = z.infer<typeof nopeSchema>;

export const createNopeSchema = z.object({
  input: z.string().trim().min(1),
  reply: z.string().trim().min(1),
  cost: z.number().nonnegative().optional(),
});

export type CreateNope = z.infer<typeof createNopeSchema>;
