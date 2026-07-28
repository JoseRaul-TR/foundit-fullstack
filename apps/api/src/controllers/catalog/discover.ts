// apps/api/src/controllers/catalog/discover.ts
/**
 * Exposes GET /discover/movies and GET /discover/series.
 *
 * Auth is OPTIONAL here (extractSession, not requireAuth) — same pattern
 * as movies.ts/series.ts. Discover only makes sense as a personalized
 * feature in practice (it's gated to the authenticated+idle state of
 * index.vue per the ticket), but the endpoint itself doesn't hard-require
 * a session: `regions`/`excludeWatched` simply have no effect without one.
 *
 * `regions` is a JSON-encoded array (`[{"countryCode":"ES","providerIds":[8,337]}]`)
 * rather than several flat query params — the frontend already has this
 * shape from profileStore.subscribedServices grouped by country, and a
 * JSON blob avoids fragile positional-array query param encoding.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { extractSession } from "@/lib/auth";
import {
  discoverMovies,
  discoverSeries,
  type DiscoverSort,
  type RegionGroup,
  type SeriesStatusFilter,
} from "@/services/catalog/discover";

const regionGroupSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  providerIds: z.array(z.number().int().positive()).min(1),
});

const regionsQuerySchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw);
      const result = z.array(regionGroupSchema).safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: "Invalid regions shape" });
        return z.NEVER;
      }
      return result.data as RegionGroup[];
    } catch {
      ctx.addIssue({ code: "custom", message: "regions must be valid JSON" });
      return z.NEVER;
    }
  });

const commaSeparatedInts = z
  .string()
  .optional()
  .transform((raw) =>
    raw
      ? raw
          .split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n))
      : undefined,
  );

const baseQuerySchema = z.object({
  genres: commaSeparatedInts,
  yearFrom: z.coerce.number().optional(),
  yearTo: z.coerce.number().optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  voteCountMin: z.coerce.number().min(0).optional(),
  ageRatingMax: z.string().optional(),
  ageRatingCountry: z.string().length(2).toUpperCase().optional(),
  // Legacy single-region params — still accepted for #36/#37 callers.
  provider: z.coerce.number().optional(),
  region: z.string().optional(),
  regions: regionsQuerySchema,
  sort: z
    .enum(["popularity", "rating", "release_date", "title"])
    .default("popularity"),
  excludeWatched: z.coerce.boolean().default(true),
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
  const user = await extractSession(req);

  const data = await discoverMovies({
    genres: query.genres,
    yearFrom: query.yearFrom,
    yearTo: query.yearTo,
    minRating: query.minRating,
    voteCountMin: query.voteCountMin,
    ageRatingMax: query.ageRatingMax,
    ageRatingCountry: query.ageRatingCountry,
    provider: query.provider,
    region: query.region,
    regions: query.regions,
    sort: query.sort as DiscoverSort,
    locale: resolveLocale(query.lang),
    page: query.page,
    userId: user?.id ?? null,
    excludeWatched: query.excludeWatched,
  });

  res.json({ success: true, data });
}

export async function discoverSeriesController(req: Request, res: Response) {
  const query = seriesQuerySchema.parse(req.query);
  const user = await extractSession(req);

  const data = await discoverSeries({
    genres: query.genres,
    yearFrom: query.yearFrom,
    yearTo: query.yearTo,
    minRating: query.minRating,
    voteCountMin: query.voteCountMin,
    ageRatingMax: query.ageRatingMax,
    ageRatingCountry: query.ageRatingCountry,
    provider: query.provider,
    region: query.region,
    regions: query.regions,
    sort: query.sort as DiscoverSort,
    status: query.status as SeriesStatusFilter | undefined,
    locale: resolveLocale(query.lang),
    page: query.page,
    userId: user?.id ?? null,
    excludeWatched: query.excludeWatched,
  });

  res.json({ success: true, data });
}