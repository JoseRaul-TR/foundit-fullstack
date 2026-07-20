// apps/api/src/controllers/library/ratings.ts

import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import {
  listRatings,
  removeRating,
  upsertRating,
} from "@/services/library/ratings";

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

export async function listRatingsController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { page } = getQuerySchema.parse(req.query);
  const ratings = await listRatings(userId, page);
  res.json({ success: true, data: ratings });
}

export async function upsertRatingController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbId, mediaType, rating } = postBodySchema.parse(req.body);
  const item = await upsertRating(userId, { tmdbId, mediaType, rating });
  res.json({ success: true, data: item });
}

export async function removeRatingController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbId, mediaType } = deleteParamsSchema.parse(req.params);
  await removeRating(userId, tmdbId, mediaType);
  res.json({ success: true, data: null });
}
