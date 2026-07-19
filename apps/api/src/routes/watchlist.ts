// apps/api/src/rooutes/watchlist.ts
/**
 * tmdbLimiter (not left unlimited like /api/profile) because every GET here
 * fans out into up to 20 TMDB calls, and POST does one more — same reasoning
 * as movies/series/search/discover/people/genres/providers/countries.
 *
 * Deliberate deviations from #46/#47's convention, flagging for confirmation:
 *   - POST returns the single created/enriched item, not the full updated
 *     watchlist page (#46/#47 both returned the whole updated list, but here
 *     "the whole list" is a paginated + TMDB-enriched thing, not a cheap
 *     re-query — recomputing it would mean re-fetching the current page's
 *     20 items from TMDB again for no reason, since the client already has
 *     that page rendered and just needs to know what got added).
 *   - DELETE returns { success: true, data: null } (no body content to
 *     return, and re-deriving the page here has the same cost problem as
 *     above).
 */

import { requireAuth } from "@/lib/auth";
import { AppError } from "@/middleware/errorHandler";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/services/watchlist";
import { Router } from "express";
import z from "zod";

const router = Router();

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

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const query = getQuerySchema.parse(req.query);
  const data = await getWatchlist(userId, query);

  res.json({ success: true, data });
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbId, mediaType } = addBodySchema.parse(req.body);
  const item = await addToWatchlist(userId, { tmdbId, mediaType });

  res.json({ success: true, data: item });
});

router.delete("/:tmdbId/:mediaType", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { tmdbId, mediaType } = removeParamsSchema.parse(req.params);
  await removeFromWatchlist(userId, tmdbId, mediaType);

  res.json({ success: true, data: null });
});

export default router;
