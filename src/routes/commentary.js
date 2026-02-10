import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  listCommentaryQuerySchema,
  createCommentarySchema,
} from "../validation/commentary.js";
import { commentary } from "../db/schema.js";
import { db } from "../db/db.js";
import { desc, eq } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });
const MAX_LIMIT = 100;

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid route parameters",
      details: JSON.stringify(parsedParams.error),
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid commentary payload",
      details: JSON.stringify(parsedBody.error),
    });
  }

  try {
    const payload = {
      matchId: parsedParams.data.id,
      minute: parsedBody.data.minute,
      sequence: parsedBody.data.sequence,
      period: parsedBody.data.period,
      eventType: parsedBody.data.eventType,
      actor: parsedBody.data.actor ?? null,
      team: parsedBody.data.team ?? null,
      message: parsedBody.data.message,
      metadata: JSON.stringify(parsedBody.data.metadata ?? {}),
      tags: JSON.stringify(parsedBody.data.tags ?? []),
    };

    const [inserted] = await db.insert(commentary).values(payload).returning();

    const result = {
      ...inserted,
      metadata: inserted.metadata ? JSON.parse(inserted.metadata) : {},
      tags: inserted.tags ? JSON.parse(inserted.tags) : [],
    };

    if (res.app.locals.broadcastToCommentary) {
      res.app.locals.broadcastToCommentary(result.matchId, result);
    }
    res.status(201).json({ commentary: result });
  } catch (e) {
    res.status(500).json({
      error: "Failed to create commentary",
      details: JSON.stringify(e),
    });
  }
});

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid route parameters",
      details: JSON.stringify(parsedParams.error),
    });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: JSON.stringify(parsedQuery.error),
    });
  }

  const limit = Math.min(parsedQuery.data.limit ?? 100, MAX_LIMIT);

  try {
    const rows = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, parsedParams.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    const data = rows.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));

    res.json({ data });
  } catch (e) {
    res.status(500).json({
      error: "Failed to fetch commentary",
      details: JSON.stringify(e),
    });
  }
});
