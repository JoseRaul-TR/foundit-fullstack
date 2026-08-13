// apps/api/src/controllers/catalog/movies.ts

import type { Request, Response } from "express";
import { z } from "zod";
import {
  isLocale,
  type SupportedLocale,
  type MovieDetailResponse,
  type NormalizedSearchResult,
  type PaginatedResponse,
} from "@foundit/types";
import { extractSession } from "@/lib/auth";
import {
  getMovieDetail,
  getMovieRecommendations,
} from "@/services/catalog/movies";

const paramsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a numeric string")
    .transform(Number),
});
const querySchema = z.object({ lang: z.string().optional() });
// 500 is TMDB's own ceiling on page, the same bound discover.ts uses.
const recommendationsQuerySchema = querySchema.extend({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export async function getMovieDetailController(req: Request, res: Response) {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const user = await extractSession(req);
  const movie = await getMovieDetail(tmdbId, locale, user?.id ?? null);

  res.json({ success: true, data: movie } satisfies {
    success: true;
    data: MovieDetailResponse;
  });
}

/**
 * No session needed: recommendations carry nothing user-specific. The row is
 * only shown to signed-in users, but that's a decision the client makes, and
 * requiring auth here would be a second, redundant place to change it.
 */
export async function getMovieRecommendationsController(
  req: Request,
  res: Response,
) {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang, page } = recommendationsQuerySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const data = await getMovieRecommendations(tmdbId, locale, page);

  res.json({ success: true, data } satisfies {
    success: true;
    data: PaginatedResponse<NormalizedSearchResult>;
  });
}
