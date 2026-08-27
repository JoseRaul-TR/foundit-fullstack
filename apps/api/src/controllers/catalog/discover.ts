// apps/api/src/controllers/catalog/discover.ts

/**
 * Exposes GET /discover/movies and GET /discover/series.
 *
 * Auth is REQUIRED here, unlike movies.ts/series.ts and unlike this endpoint
 * until #210. Every Discover filter reads the user: `regions` comes from their
 * subscriptions, `excludeWatched` from their history, `ageRatingCountry` from
 * their profile. Without a session the endpoint used to answer 200 with a
 * generic feed and say nothing — so losing a session mid-browse silently
 * replaced personalized results with unpersonalized ones. requireAuth makes it
 * a 401, which apiFetch already knows how to turn into a trip to login.
 *
 * `regions` is a JSON-encoded array (`[{"countryCode":"ES","providerIds":[8,337]}]`)
 * rather than several flat query params — the frontend already has this
 * shape from profileStore.subscribedServices grouped by country, and a
 * JSON blob avoids fragile positional-array query param encoding.
 *
 * Since #184 it is also the ONLY way to express a country or platform
 * constraint. The flat `region`/`provider` pair that used to sit alongside it
 * belonged to the legacy single-region path and no client ever sent them.
 */
import type { Request, Response } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { getUserId } from "@/lib/auth";
import { discoverMovies, discoverSeries } from "@/services/catalog/discover";

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
      const parsed: unknown = JSON.parse(raw);
      const result = z.array(regionGroupSchema).safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: "Invalid regions shape" });
        return z.NEVER;
      }
      return result.data;
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
  regions: regionsQuerySchema,
  // .catch rather than .default: `default` only covers a missing value, and
  // `rating` and `title` were real options until #279. A client that still
  // sends one — a stale bundle, a saved request — gets the default order
  // instead of a 400 for a parameter it had no way to know had changed.
  sort: z.enum(["popularity", "release_date"]).catch("popularity"),
  excludeWatched: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
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
  const userId = getUserId(req);

  const data = await discoverMovies({
    genres: query.genres,
    yearFrom: query.yearFrom,
    yearTo: query.yearTo,
    minRating: query.minRating,
    voteCountMin: query.voteCountMin,
    ageRatingMax: query.ageRatingMax,
    ageRatingCountry: query.ageRatingCountry,
    regions: query.regions,
    sort: query.sort,
    locale: resolveLocale(query.lang),
    page: query.page,
    userId,
    excludeWatched: query.excludeWatched,
  });

  res.json({ success: true, data });
}

export async function discoverSeriesController(req: Request, res: Response) {
  const query = seriesQuerySchema.parse(req.query);
  const userId = getUserId(req);

  const data = await discoverSeries({
    genres: query.genres,
    yearFrom: query.yearFrom,
    yearTo: query.yearTo,
    minRating: query.minRating,
    voteCountMin: query.voteCountMin,
    ageRatingMax: query.ageRatingMax,
    ageRatingCountry: query.ageRatingCountry,
    regions: query.regions,
    sort: query.sort,
    status: query.status,
    locale: resolveLocale(query.lang),
    page: query.page,
    userId,
    excludeWatched: query.excludeWatched,
  });

  res.json({ success: true, data });
}
