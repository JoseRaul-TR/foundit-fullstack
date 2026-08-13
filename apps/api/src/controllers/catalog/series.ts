// apps/api/src/controllers/catalog/series.ts

import type { Request, Response } from "express";
import { z } from "zod";
import {
  isLocale,
  type SupportedLocale,
  type SeriesDetailResponse,
  type SeriesSeasonDetailResponse,
  type NormalizedSearchResult,
  type PaginatedResponse,
} from "@foundit/types";
import { extractSession } from "@/lib/auth";
import {
  getSeriesDetail,
  getSeriesRecommendations,
  getSeriesSeasonDetail,
} from "@/services/catalog/series";

const paramsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a numeric string")
    .transform(Number),
});
const querySchema = z.object({ lang: z.string().optional() });
const recommendationsQuerySchema = querySchema.extend({
  page: z.coerce.number().int().min(1).max(500).default(1),
});
const seasonParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a numeric string")
    .transform(Number),
  n: z
    .string()
    .regex(/^\d+$/, "season must be a numeric string")
    .transform(Number),
});

export async function getSeriesDetailController(req: Request, res: Response) {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const user = await extractSession(req);
  const series = await getSeriesDetail(tmdbId, locale, user?.id ?? null);

  res.json({ success: true, data: series } satisfies {
    success: true;
    data: SeriesDetailResponse;
  });
}

/** See getMovieRecommendationsController. */
export async function getSeriesRecommendationsController(
  req: Request,
  res: Response,
) {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang, page } = recommendationsQuerySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const data = await getSeriesRecommendations(tmdbId, locale, page);

  res.json({ success: true, data } satisfies {
    success: true;
    data: PaginatedResponse<NormalizedSearchResult>;
  });
}

export async function getSeriesSeasonDetailController(
  req: Request,
  res: Response,
) {
  const { id: tmdbId, n: seasonNumber } = seasonParamsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const season = await getSeriesSeasonDetail(tmdbId, seasonNumber, locale);

  res.json({ success: true, data: season } satisfies {
    success: true;
    data: SeriesSeasonDetailResponse;
  });
}
