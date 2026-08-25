// apps/api/src/controllers/library/watchlist.ts

/**
 * HTTP-adapter layer: parses req.query/req.body/req.params, calls the
 * service, shapes the response. No business logic here — that's entirely
 * in services/library/watchlist.service.ts, which never imports Express
 * types.
 */
import type { Request, Response } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { getUserId } from "@/lib/auth";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/services/library/watchlist";

/**
 * `lang` has been arriving on every request since apiFetch was introduced —
 * z.object strips unknown keys, so it was discarded rather than rejected and
 * the list came back in English whatever the UI was showing (#189). Same
 * shape as the search controller: a plain optional string, narrowed to a
 * SupportedLocale here rather than trusted from the wire.
 */
const getQuerySchema = z.object({
  type: z.enum(["all", "movie", "series"]).default("all"),
  sort: z.enum(["added", "year"]).default("added"),
  lang: z.string().optional(),
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
  const { lang, ...query } = getQuerySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";
  const data = await getWatchlist(userId, { ...query, locale });
  res.json({ success: true, data });
}

/**
 * Returns the single created/enriched item, not the full updated watchlist
 * page — recomputing the page would mean re-fetching TMDB for items the
 * client already has rendered, just to report what changed.
 *
 * Takes no `lang`, deliberately. This is the one write that caches a title,
 * and the cached title is what a future ORDER BY would sort on — so it stays
 * in one language rather than becoming whatever the user happened to be
 * reading. Nothing on the client consumes this response body (both watchlist
 * mutations invalidate and refetch), so there is no visible cost. See #234,
 * where the fact that every stored title is English is the difference between
 * a migration that knows what it has and one that has to guess.
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
