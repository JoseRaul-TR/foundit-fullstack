// apps /api/src/routes/ratings.ts

import { requireAuth } from "@/lib/auth";
import { AppError } from "@/middleware/errorHandler";
import { listRatings, removeRating, upsertRating } from "@/services/ratings";
import { Router } from "express";
import z from "zod";

const router = Router();

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

const postBodySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
  rating: z.coerce.number().int().min(1).max(10),
});

const deleteParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
});

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { page } = getQuerySchema.parse(req.query);
  const ratings = await listRatings(userId, page);
  res.json({ success: true, data: ratings });
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbId, mediaType, rating } = postBodySchema.parse(req.body);
  const item = await upsertRating(userId, { tmdbId, mediaType, rating });

  res.json({ success: true, data: item });
});

router.delete("/:tmdbId/:mediaType", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbId, mediaType } = deleteParamsSchema.parse(req.params);
  await removeRating(userId, tmdbId, mediaType);

  res.json({ success: true, data: null });
});

export default router;
