// apps/api/src/services/catalog/discover.ts
/**
 * Naming: exposed as /api/discover/series, not /api/discover/tv (ticket's
 * literal text) — same tv->series convention as #39/#35.
 *
 * "upcoming" status filter (2026-07-17): verified live against TMDB that
 * /discover/tv's with_status uses the same separator convention as
 * with_genres — comma is AND, pipe is OR. So "upcoming" (TMDB's
 * Planned/In Production/Pilot, codes 1/2/5) is safely expressed as the
 * pipe-joined string "1|2|5".
 *
 * ─── Ticket #63 additions (multi-region personalized Discover) ──────────
 *
 * TMDB only accepts ONE watch_region per /discover call, but multiple
 * providers CAN be OR'd within a single call for that region
 * (with_watch_providers=8|337). So combining a user's ES+SE subscriptions
 * means ONE call per country (providers OR'd inside it), not one call per
 * provider — see discoverMoviesMultiRegion/discoverSeriesMultiRegion.
 *
 * No-data-loss merge algorithm: each region gets its own buffer + page
 * cursor. Pages are fetched (in parallel, one per still-open region) until
 * the combined, deduped, filtered item count is enough to satisfy the
 * requested page, or every region is exhausted. Only then is everything
 * merged, deduped by tmdbId, sorted by the user's chosen criterion, and
 * sliced to the exact page window. Nothing fetched from TMDB is ever
 * discarded before being considered — only excluded by an explicit filter
 * (watched/age-rating), never dropped by an early slice.
 *
 * AgeRating: /discover/movie has a native certification.lte + certification_country
 * filter — used directly, no extra TMDB calls. /discover/tv has NO
 * equivalent — per José's decision (2026-07-28), series get a bounded
 * post-filter instead: only the items actually sitting in the current
 * buffer window get one extra /tv/{id}?append_to_response=content_ratings
 * call each, compared against TMDB's own per-country certification order
 * (via certifications.ts). This is still bounded by page depth, not by
 * the full catalog.
 *
 * excludeWatched: movies is a plain WatchedItem set-difference (no extra
 * calls). Series "fully watched" needs each candidate's number_of_seasons,
 * which discover/tv list items don't carry — so, same bounded-N+1
 * principle, only candidates where the user has watched AT LEAST one
 * season already get a /tv/{id} detail call (reusing the same call as the
 * age-rating check when both apply, via append_to_response=content_ratings
 * regardless — cheap to always append since it's a single small field).
 */

import { fetchTmdb } from "@/lib/tmdb";
import {
  extractRecommendations,
  extractSeriesCertificationForCountry,
} from "@/helpers/tmdbMedia";
import { getCertificationOrderMap } from "@/services/catalog/certifications";
import prisma from "@/lib/prisma";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";
import type {
  NormalizedSearchResult,
  PaginatedResponse,
  SupportedLocale,
} from "@foundit/types";
import type {
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
  TmdbSeries,
} from "@/types/tmdb.types";

export type DiscoverSort = "popularity" | "rating" | "release_date" | "title";

export interface RegionGroup {
  countryCode: string;
  providerIds: number[];
}

export interface DiscoverParams {
  genres?: number[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  voteCountMin?: number;
  ageRatingCountry?: string;
  ageRatingMax?: string;
  sort: DiscoverSort;
  locale: SupportedLocale;
  page: number;
  userId?: string | null;
  excludeWatched?: boolean;
  // Legacy single-region shape, kept working for whatever #36/#37 already
  // shipped it for — untouched code path below (discoverMovies/discoverSeries).
  provider?: number;
  region?: string;
  // New: personalized multi-region mode. When present, takes over.
  regions?: RegionGroup[];
}

export type SeriesStatusFilter =
  "returning" | "ended" | "canceled" | "upcoming";

export interface SeriesDiscoverParams extends DiscoverParams {
  status?: SeriesStatusFilter;
}

const PAGE_SIZE = 20;
const DEFAULT_VOTE_COUNT_MIN = 20; // assumption — no explicit floor was given; tune freely, it's a one-line change here.

/**
 * TMDB's `adult` flag does not catch soft-core or erotic titles. Verified
 * against live data (2026-08-04): tv/233643, an explicit hentai series,
 * arrives with `adult: false` and ranks SECOND on page 1 for watch_region=SE,
 * ahead of Grey's Anatomy. Its TMDB keywords, however, are unambiguous.
 *
 * Only the two unambiguous keywords are excluded. Adding "erotic" (256466)
 * was measured and deliberately rejected: it raised exclusions from 9 to 39
 * series, but among them was Mushoku Tensei: Jobless Reincarnation — a
 * mainstream isekai anime rated 8.5 with 1600+ votes. Silently hiding
 * legitimate catalogue from a discovery app is worse than the problem being
 * solved; users wanting a stricter cut have the age-rating filter.
 *
 * Measured impact: 9 of 12,380 series (0.07%) and the movie equivalent.
 */
const EXCLUDED_KEYWORDS = [
  198385, // hentai
  155477, // softcore
].join("|");

/**
 * Sent on every Discover query, movies and series alike.
 */
const CONTENT_SAFETY_PARAMS = {
  // TMDB defaults this to false on /discover, but relying on an undocumented
  // default for a content-safety setting is fragile — state it.
  include_adult: false,
  // Inert today: TMDB returns a `softcore` boolean on every result but hasn't
  // populated it (verified — sending this changes no result count). Sent
  // anyway so the filter starts working the day they fill that field in.
  // Do NOT remove as "unused".
  include_softcore: false,
  without_keywords: EXCLUDED_KEYWORDS,
} as const;

// ─── Legacy single-region path (#36/#37) — unchanged behavior ───────────

const SORT_TO_TMDB_MOVIE: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  release_date: "primary_release_date.desc",
  title: "original_title.asc", // TMDB has no localized-title sort; only used pre-#63
};

const SORT_TO_TMDB_SERIES: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  release_date: "first_air_date.desc",
  title: "name.asc",
};

const STATUS_TO_TMDB_CODE: Record<SeriesStatusFilter, string> = {
  returning: "0",
  ended: "3",
  canceled: "4",
  upcoming: "1|2|5",
};

type TmdbDiscoverParams = Record<string, string | number | boolean | undefined>;

function buildLegacyBaseParams(
  params: DiscoverParams,
  sortMap: Record<DiscoverSort, string>,
): TmdbDiscoverParams {
  return {
    ...CONTENT_SAFETY_PARAMS,
    with_genres: params.genres?.join("|"),
    "vote_average.gte": params.minRating,
    with_watch_providers: params.provider,
    watch_region: params.region,
    sort_by: sortMap[params.sort],
    language: LOCALE_TO_TMDB_LANG[params.locale],
    page: params.page,
  };
}

function toPaginated(
  response: TmdbPaginatedResponse<TmdbSearchResultItem>,
  mediaType: "movie" | "series",
): PaginatedResponse<NormalizedSearchResult> {
  return {
    results: extractRecommendations(response, mediaType, PAGE_SIZE),
    totalResults: response.total_results,
    totalPages: response.total_pages,
    page: response.page,
  };
}

export async function discoverMovies(
  params: DiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  if (params.regions?.length) {
    return discoverMoviesMultiRegion(params.regions, params);
  }

  const tmdbParams: TmdbDiscoverParams = {
    ...buildLegacyBaseParams(params, SORT_TO_TMDB_MOVIE),
    primary_release_year: params.yearFrom,
    "vote_count.gte": params.voteCountMin ?? DEFAULT_VOTE_COUNT_MIN,
    ...(params.ageRatingMax && params.ageRatingCountry
      ? {
          "certification.lte": params.ageRatingMax,
          certification_country: params.ageRatingCountry,
        }
      : {}),
  };

  const response = await fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/movie",
    tmdbParams,
  );
  return toPaginated(response, "movie");
}

export async function discoverSeries(
  params: SeriesDiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  if (params.regions?.length) {
    return discoverSeriesMultiRegion(params.regions, params);
  }

  const tmdbParams: TmdbDiscoverParams = {
    ...buildLegacyBaseParams(params, SORT_TO_TMDB_SERIES),
    first_air_date_year: params.yearFrom,
    "vote_count.gte": params.voteCountMin ?? DEFAULT_VOTE_COUNT_MIN,
    with_status: params.status ? STATUS_TO_TMDB_CODE[params.status] : undefined,
  };

  const response = await fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/tv",
    tmdbParams,
  );
  return toPaginated(response, "series");
}

// ─── New: multi-region personalized path (#63) ───────────────────────────

interface RegionBuffer {
  countryCode: string;
  items: NormalizedSearchResult[];
  nextPage: number;
  totalPages: number;
  exhausted: boolean;
}

function initBuffers(regions: RegionGroup[]): RegionBuffer[] {
  return regions.map((r) => ({
    countryCode: r.countryCode,
    items: [],
    nextPage: 1,
    totalPages: Infinity,
    exhausted: false,
  }));
}

function dedupeAndMerge(buffers: RegionBuffer[]): NormalizedSearchResult[] {
  const seen = new Set<number>();
  const merged: NormalizedSearchResult[] = [];
  for (const buffer of buffers) {
    for (const item of buffer.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  return merged;
}

const SORT_COMPARATORS: Record<
  DiscoverSort,
  (a: NormalizedSearchResult, b: NormalizedSearchResult) => number
> = {
  popularity: (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
  rating: (a, b) => (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0),
  release_date: (a, b) => (b.year ?? 0) - (a.year ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
};

async function fetchMovieRegionPage(
  countryCode: string,
  providerIds: number[],
  page: number,
  params: DiscoverParams,
): Promise<TmdbPaginatedResponse<TmdbSearchResultItem>> {
  return fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/movie",
    {
      ...CONTENT_SAFETY_PARAMS,
      with_genres: params.genres?.join("|"),
      "primary_release_date.gte": params.yearFrom
        ? `${params.yearFrom}-01-01`
        : undefined,
      "primary_release_date.lte": params.yearTo
        ? `${params.yearTo}-12-31`
        : undefined,
      "vote_average.gte": params.minRating,
      "vote_count.gte": params.voteCountMin ?? DEFAULT_VOTE_COUNT_MIN,
      with_watch_providers: providerIds.join("|"),
      watch_region: countryCode,
      ...(params.ageRatingMax && params.ageRatingCountry
        ? {
            "certification.lte": params.ageRatingMax,
            certification_country: params.ageRatingCountry,
          }
        : {}),
      // Always fetch by TMDB popularity order — the final in-memory sort
      // (whatever the user picked) is applied after merging, regardless of
      // fetch order. This keeps the fetch order stable and simple.
      sort_by: "popularity.desc",
      language: LOCALE_TO_TMDB_LANG[params.locale],
      page,
    },
  );
}

async function fetchSeriesRegionPage(
  countryCode: string,
  providerIds: number[],
  page: number,
  params: SeriesDiscoverParams,
): Promise<TmdbPaginatedResponse<TmdbSearchResultItem>> {
  return fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/tv",
    {
      ...CONTENT_SAFETY_PARAMS,
      with_genres: params.genres?.join("|"),
      "first_air_date.gte": params.yearFrom
        ? `${params.yearFrom}-01-01`
        : undefined,
      "first_air_date.lte": params.yearTo
        ? `${params.yearTo}-12-31`
        : undefined,
      "vote_average.gte": params.minRating,
      "vote_count.gte": params.voteCountMin ?? DEFAULT_VOTE_COUNT_MIN,
      with_watch_providers: providerIds.join("|"),
      watch_region: countryCode,
      with_status: params.status
        ? STATUS_TO_TMDB_CODE[params.status]
        : undefined,
      sort_by: "popularity.desc",
      language: LOCALE_TO_TMDB_LANG[params.locale],
      page,
    },
  );
}

async function fillBuffers(
  buffers: RegionBuffer[],
  needed: number,
  fetchPage: (
    countryCode: string,
    page: number,
  ) => Promise<TmdbPaginatedResponse<TmdbSearchResultItem>>,
  mediaType: "movie" | "series",
): Promise<void> {
  let total = buffers.reduce((sum, b) => sum + b.items.length, 0);

  while (total < needed && buffers.some((b) => !b.exhausted)) {
    await Promise.all(
      buffers
        .filter((b) => !b.exhausted)
        .map(async (b) => {
          const response = await fetchPage(b.countryCode, b.nextPage);
          b.items.push(
            ...extractRecommendations(response, mediaType, PAGE_SIZE),
          );
          b.totalPages = response.total_pages;
          b.nextPage += 1;
          b.exhausted = b.nextPage > response.total_pages;
        }),
    );
    total = buffers.reduce((sum, b) => sum + b.items.length, 0);
  }
}

async function loadWatchedMovieIds(userId: string): Promise<Set<number>> {
  const rows = await prisma.watchedItem.findMany({
    where: { userId, mediaType: "movie", seasonNumber: null },
    select: { tmdbId: true },
  });
  return new Set(rows.map((r) => r.tmdbId));
}

/**
 * tmdbId -> count of distinct watched seasons, for the fully-watched series
 * check. Season 0 is TMDB's specials bucket and is deliberately skipped:
 * number_of_seasons doesn't include it, so counting it here inflates the total
 * and would mark a series as finished while a real season is still unwatched.
 */
async function loadWatchedSeriesSeasonCounts(
  userId: string,
): Promise<Map<number, number>> {
  const rows = await prisma.watchedItem.findMany({
    where: { userId, mediaType: "series" },
    select: { tmdbId: true, seasonNumber: true },
  });
  const counts = new Map<number, Set<number>>();
  for (const row of rows) {
    if (row.seasonNumber === null || row.seasonNumber === 0) continue;
    const set = counts.get(row.tmdbId) ?? new Set<number>();
    set.add(row.seasonNumber);
    counts.set(row.tmdbId, set);
  }
  return new Map([...counts.entries()].map(([id, set]) => [id, set.size]));
}

export async function discoverMoviesMultiRegion(
  regions: RegionGroup[],
  params: DiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const buffers = initBuffers(regions);
  const excludeWatched = params.excludeWatched && !!params.userId;
  const watchedIds = excludeWatched
    ? await loadWatchedMovieIds(params.userId!)
    : new Set<number>();

  let survivors: NormalizedSearchResult[];
  let target = params.page * PAGE_SIZE;

  // Loop: fill, filter, check if enough survived; if not (and there's
  // still more to fetch), raise the target and try again. Bounded by all
  // regions eventually exhausting.
  for (;;) {
    await fillBuffers(
      buffers,
      target,
      (countryCode, page) => {
        const providerIds = regions.find(
          (r) => r.countryCode === countryCode,
        )!.providerIds;
        return fetchMovieRegionPage(countryCode, providerIds, page, params);
      },
      "movie",
    );

    const merged = dedupeAndMerge(buffers).sort(SORT_COMPARATORS[params.sort]);
    survivors = excludeWatched
      ? merged.filter((item) => !watchedIds.has(item.id))
      : merged;

    const allExhausted = buffers.every((b) => b.exhausted);
    if (survivors.length >= target || allExhausted) break;
    target += PAGE_SIZE;
  }

  const start = (params.page - 1) * PAGE_SIZE;
  const pageItems = survivors.slice(start, start + PAGE_SIZE);
  const hasMore =
    survivors.length > start + PAGE_SIZE || buffers.some((b) => !b.exhausted);

  return {
    results: pageItems,
    totalResults: survivors.length, // approximate: merged-so-far count, not a true TMDB total across regions
    totalPages: hasMore ? params.page + 1 : params.page,
    page: params.page,
  };
}

export async function discoverSeriesMultiRegion(
  regions: RegionGroup[],
  params: SeriesDiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const buffers = initBuffers(regions);
  const excludeWatched = params.excludeWatched && !!params.userId;
  const watchedSeasonCounts = excludeWatched
    ? await loadWatchedSeriesSeasonCounts(params.userId!)
    : new Map<number, number>();

  const needsAgeRatingCheck = !!(
    params.ageRatingMax && params.ageRatingCountry
  );
  const ageRatingOrderMap = needsAgeRatingCheck
    ? await getCertificationOrderMap("series", params.ageRatingCountry!)
    : new Map<string, number>();
  const ageRatingMaxOrder = needsAgeRatingCheck
    ? ageRatingOrderMap.get(params.ageRatingMax!)
    : undefined;

  // Bounded N+1: only fetch full detail for candidates that either (a)
  // the user has at least one watched season for (fully-watched check) or
  // (b) need the age-rating post-filter — never for the whole buffer.
  async function enrichAndFilter(
    items: NormalizedSearchResult[],
  ): Promise<NormalizedSearchResult[]> {
    const survivors: NormalizedSearchResult[] = [];

    await Promise.all(
      items.map(async (item) => {
        const watchedSeasons = watchedSeasonCounts.get(item.id) ?? 0;
        const needsDetail =
          needsAgeRatingCheck || (excludeWatched && watchedSeasons > 0);

        if (!needsDetail) {
          survivors.push(item);
          return;
        }

        const detail = await fetchTmdb<TmdbSeries>(`/tv/${item.id}`, {
          append_to_response: "content_ratings",
        });

        if (
          excludeWatched &&
          watchedSeasons > 0 &&
          watchedSeasons >= detail.number_of_seasons
        ) {
          return; // fully watched — excluded
        }

        if (needsAgeRatingCheck) {
          const rating = extractSeriesCertificationForCountry(
            detail.content_ratings,
            params.ageRatingCountry!,
          );
          const ratingOrder = rating
            ? ageRatingOrderMap.get(rating)
            : undefined;
          // Unrated (no certification data for that country) is let through
          // rather than excluded — TMDB certification coverage for series
          // is patchy, and silently hiding unrated shows would remove a lot
          // of legitimate results.
          if (
            ratingOrder !== undefined &&
            ageRatingMaxOrder !== undefined &&
            ratingOrder > ageRatingMaxOrder
          ) {
            return;
          }
        }

        survivors.push(item);
      }),
    );

    return survivors;
  }

  let survivors: NormalizedSearchResult[];
  let target = params.page * PAGE_SIZE;

  for (;;) {
    await fillBuffers(
      buffers,
      target,
      (countryCode, page) => {
        const providerIds = regions.find(
          (r) => r.countryCode === countryCode,
        )!.providerIds;
        return fetchSeriesRegionPage(countryCode, providerIds, page, params);
      },
      "series",
    );

    const merged = dedupeAndMerge(buffers).sort(SORT_COMPARATORS[params.sort]);
    survivors = await enrichAndFilter(merged);

    const allExhausted = buffers.every((b) => b.exhausted);
    if (survivors.length >= target || allExhausted) break;
    target += PAGE_SIZE;
  }

  const start = (params.page - 1) * PAGE_SIZE;
  const pageItems = survivors.slice(start, start + PAGE_SIZE);
  const hasMore =
    survivors.length > start + PAGE_SIZE || buffers.some((b) => !b.exhausted);

  return {
    results: pageItems,
    totalResults: survivors.length,
    totalPages: hasMore ? params.page + 1 : params.page,
    page: params.page,
  };
}
