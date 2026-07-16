// apps/api/src/routes/discover.ts

import { Router } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import {
  discoverMovies,
  discoverSeries,
  type DiscoverSort,
  type SeriesStatusFilter,
} from "@/services/discover";

const router = Router();

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
  status: z.enum(["returning", "ended", "canceled"]).optional(),
});

function resolveLocale(lang: string | undefined): SupportedLocale {
  return lang && isLocale(lang) ? lang : "en";
}

router.get("/movies", async (req, res) => {
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
});

router.get("/series", async (req, res) => {
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
});

export default router;
