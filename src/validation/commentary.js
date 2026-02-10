import { z } from "zod";

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().min(0),
  sequence: z.coerce.number().int().min(0),
  period: z.string().min(1),
  eventType: z.string().min(1),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

console.log("Commentary validation schemas loaded.");

export default {
  listCommentaryQuerySchema,
  createCommentarySchema,
};
