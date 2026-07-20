// apps/api/src/controllers/library/watchlist.ts
/**
 * HTTP-adapter layer: parses req.query/req.body/req.params, calls the
 * service, shapes the response. No business logic here — that's entirely
 * in services/library/watchlist.service.ts, which never imports Express
 * types.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/services/library/watchlist";

const getQuerySchema = z.object({
  type: z.enum(["all", "movie", "series"]).default("all"),
  sort: z.enum(["added", "title", "year"]).default("added"),
  page: z.coerce.number().int().min(1).default(1),
});

const addBodySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
});

const removeParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
});

export async function getWatchlistController(req: Request, res: Response) {
  const userId = getUserId(req);
  const query = getQuerySchema.parse(req.query);
  const data = await getWatchlist(userId, query);
  res.json({ success: true, data });
}

/**
 * Returns the single created/enriched item, not the full updated watchlist
 * page — recomputing the page would mean re-fetching TMDB for items the
 * client already has rendered, just to report what changed.
 */
export async function addToWatchlistController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbId, mediaType } = addBodySchema.parse(req.body);
  const item = await addToWatchlist(userId, { tmdbId, mediaType });
  res.json({ success: true, data: item });
}

export async function removeFromWatchlistController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const { tmdbId, mediaType } = removeParamsSchema.parse(req.params);
  await removeFromWatchlist(userId, tmdbId, mediaType);
  res.json({ success: true, data: null });
}
