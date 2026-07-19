// apps/api/src/routes/history.ts

import { requireAuth } from "@/lib/auth";
import { AppError } from "@/middleware/errorHandler";
import {
  getHistory,
  markMovieWatched,
  markSeasonWatched,
  unmarkMovieWatched,
  unmarkSeasonWatched,
} from "@/services/history";
import { Router } from "express";
import z from "zod";

/**
 * tmdbLimiter for the same reason as /api/watchlist: GET fans out into up
 * to 20 TMDB calls, POST does one more.
 *
 * `type` is required (no default) on GET, since "movie" and "series" have
 * incompatible response shapes — there's no sensible combined/"all" mode
 * the way #48's watchlist had one.
 *
 * seasonNumber allows 0 (TMDB "Specials"), min(0) rather than positive().
 *
 * POST endpoints return the single created/updated item (not a full
 * re-fetched list), same precedent as #48's addToWatchlist.
 */

const router = Router();

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

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const query = getQuerySchema.parse(req.query);
  const data = await getHistory(userId, query);

  res.json({ success: true, data });
});

router.post("/movie", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbId } = markMovieBodySchema.parse(req.body);
  const item = await markMovieWatched(userId, { tmdbId });

  res.json({ success: true, data: item });
});

router.delete("/movie/:tmdbId", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbId } = movieParamsSchema.parse(req.params);
  await unmarkMovieWatched(userId, tmdbId);

  res.json({ success: true, data: null });
});

router.post("/season", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbShowId, seasonNumber } = markSeasonBodySchema.parse(req.body);
  const item = await markSeasonWatched(userId, { tmdbShowId, seasonNumber });

  res.json({ success: true, data: item });
});

router.delete(
  "/season/:tmdbShowId/:seasonNumber",
  requireAuth,
  async (req, res) => {
    const userId = req.session?.user.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const { tmdbShowId, seasonNumber } = seasonParamsSchema.parse(req.params);
    await unmarkSeasonWatched(userId, tmdbShowId, seasonNumber);

    res.json({ success: true, data: null });
  },
);

export default router;
