// apps/api/src/controllers/library/history.ts
/**
 * `type` is required (no default) on GET, since "movie" and "series" have
 * incompatible response shapes. seasonNumber allows 0 (TMDB "Specials").
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import {
  getHistory,
  markMovieWatched,
  markSeasonWatched,
  unmarkMovieWatched,
  unmarkSeasonWatched,
} from "@/services/library/history";

const getQuerySchema = z.object({
  type: z.enum(["movie", "series"]),
  page: z.coerce.number().int().min(1).default(1),
});

const markMovieBodySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
});

const movieParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
});

const markSeasonBodySchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  seasonNumber: z.coerce.number().int().min(0),
});

const seasonParamsSchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  seasonNumber: z.coerce.number().int().min(0),
});

export async function getHistoryController(req: Request, res: Response) {
  const userId = getUserId(req);
  const query = getQuerySchema.parse(req.query);
  const data = await getHistory(userId, query);
  res.json({ success: true, data });
}

export async function markMovieWatchedController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbId } = markMovieBodySchema.parse(req.body);
  const item = await markMovieWatched(userId, { tmdbId });
  res.json({ success: true, data: item });
}

export async function unmarkMovieWatchedController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const { tmdbId } = movieParamsSchema.parse(req.params);
  await unmarkMovieWatched(userId, tmdbId);
  res.json({ success: true, data: null });
}

export async function markSeasonWatchedController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbShowId, seasonNumber } = markSeasonBodySchema.parse(req.body);
  const item = await markSeasonWatched(userId, { tmdbShowId, seasonNumber });
  res.json({ success: true, data: item });
}

export async function unmarkSeasonWatchedController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const { tmdbShowId, seasonNumber } = seasonParamsSchema.parse(req.params);
  await unmarkSeasonWatched(userId, tmdbShowId, seasonNumber);
  res.json({ success: true, data: null });
}
