//apps/api/src/controllers/catalog/discover.ts
/**
 * Exposes GET /discover/movies and GET /discover/series (not /discover/tv —
 * same naming convention as #35/#39). Public endpoints, no session lookup.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import {
  discoverMovies,
  discoverSeries,
  type DiscoverSort,
  type SeriesStatusFilter,
} from "@/services/catalog/discover";

const baseQuerySchema = z.object({
  genre: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  provider: z.coerce.number().optional(),
  region: z.string().optional(),
  sort: z.enum(["popularity", "rating", "release_date"]).default("popularity"),
  lang: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const seriesQuerySchema = baseQuerySchema.extend({
  status: z.enum(["returning", "ended", "canceled", "upcoming"]).optional(),
});

function resolveLocale(lang: string | undefined): SupportedLocale {
  return lang && isLocale(lang) ? lang : "en";
}

export async function discoverMoviesController(req: Request, res: Response) {
  const query = baseQuerySchema.parse(req.query);

  const data = await discoverMovies({
    genre: query.genre,
    year: query.year,
    minRating: query.minRating,
    provider: query.provider,
    region: query.region,
    sort: query.sort as DiscoverSort,
    locale: resolveLocale(query.lang),
    page: query.page,
  });

  res.json({ success: true, data });
}

export async function discoverSeriesController(req: Request, res: Response) {
  const query = seriesQuerySchema.parse(req.query);

  const data = await discoverSeries({
    genre: query.genre,
    year: query.year,
    minRating: query.minRating,
    provider: query.provider,
    region: query.region,
    sort: query.sort as DiscoverSort,
    status: query.status as SeriesStatusFilter | undefined,
    locale: resolveLocale(query.lang),
    page: query.page,
  });

  res.json({ success: true, data });
}
