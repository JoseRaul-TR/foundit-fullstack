// apps/api/src/controllers/library/history.ts
/**
 * `type` is required (no default) on GET, since "movie" and "series" have
 * incompatible response shapes. seasonNumber allows 0 (TMDB "Specials").
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
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
  lang: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** The mark endpoints return an enriched item, so they need the language too. */
const langQuerySchema = z.object({ lang: z.string().optional() });

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

function toLocale(lang: string | undefined): SupportedLocale {
  return lang && isLocale(lang) ? lang : "en";
}
export async function getHistoryController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { lang, ...query } = getQuerySchema.parse(req.query);
  const data = await getHistory(userId, { ...query, locale: toLocale(lang) });
  res.json({ success: true, data });
}

export async function markMovieWatchedController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbId } = markMovieBodySchema.parse(req.body);
  const { lang } = langQuerySchema.parse(req.query);
  const item = await markMovieWatched(userId, { tmdbId }, toLocale(lang));
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
  const { lang } = langQuerySchema.parse(req.query);
  const item = await markSeasonWatched(
    userId,
    { tmdbShowId, seasonNumber },
    toLocale(lang),
  );
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
