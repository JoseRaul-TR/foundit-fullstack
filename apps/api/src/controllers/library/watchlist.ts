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

/** The add endpoint returns an enriched item, so it needs the language too. */
const langQuerySchema = z.object({ lang: z.string().optional() });

const addBodySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
});

const removeParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
});

function toLocale(lang: string | undefined): SupportedLocale {
  return lang && isLocale(lang) ? lang : "en";
}

export async function getWatchlistController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { lang, ...query } = getQuerySchema.parse(req.query);
  const data = await getWatchlist(userId, { ...query, locale: toLocale(lang) });
  res.json({ success: true, data });
}

/**
 * Returns the single created/enriched item, not the full updated watchlist
 * page — recomputing the page would mean re-fetching TMDB for items the
 * client already has rendered, just to report what changed.
 *
 * Takes `lang`, like the history mark endpoints already do. It used to take
 * none on purpose: this was the one write that cached a title, that title was
 * a future ORDER BY key, and a key in whichever language the user happened to
 * be reading is worse than one in a language that is at least known. #234
 * removed the column, so there is no key left to protect — the only thing the
 * language decides now is the item this returns, and returning it in the
 * caller's language costs nothing.
 */
export async function addToWatchlistController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { tmdbId, mediaType } = addBodySchema.parse(req.body);
  const { lang } = langQuerySchema.parse(req.query);
  const item = await addToWatchlist(
    userId,
    { tmdbId, mediaType },
    toLocale(lang),
  );
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
