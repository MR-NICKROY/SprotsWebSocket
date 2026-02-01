import { z } from "zod";

console.log("Matches validation schemas loaded.");

// Reusable ISO date string validation helper
const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Invalid ISO date string",
});

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z
  .object({
    sport: z.string().min(1),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime).getTime();
    const end = new Date(data.endTime).getTime();

    // Log to verify validation logic is working
    console.log(`Validating match: ${data.homeTeam} vs ${data.awayTeam}`);
    console.log(`Time check: Start=${start}, End=${end}`);

    if (end <= start) {
      ctx.addIssue({
        code: "custom", // Using string literal to avoid deprecated ZodIssueCode
        message: "endTime must be chronologically after startTime",
        path: ["endTime"],
      });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});
