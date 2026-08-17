import { z } from "zod";

export const CHALLENGE_INPUT_MAX_LENGTH = 500;

export const challengeRequestSchema = z.object({
  input: z
    .string()
    .trim()
    .min(1, "Say something first.")
    .max(
      CHALLENGE_INPUT_MAX_LENGTH,
      `Keep it under ${CHALLENGE_INPUT_MAX_LENGTH} characters.`,
    ),
});

export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;

// The wire schema for POST /api/challenge-me - adds the Turnstile token on top
// of challengeRequestSchema. Kept separate so the token never leaks into the
// FastAPI payload (route.ts forwards only `input` upstream) and so
// challengeRequestSchema stays reusable for plain input validation.
export const challengeApiRequestSchema = challengeRequestSchema.extend({
  turnstileToken: z.string().min(1, "Verification failed. Please try again."),
});

export type ChallengeApiRequest = z.infer<typeof challengeApiRequestSchema>;

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("phase"),
    content: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("token"),
    content: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("complete"),
    content: z.string(),
    timestamp: z.number(),
    cost: z.number().optional(),
    id: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    content: z.string(),
    timestamp: z.number(),
  }),
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
