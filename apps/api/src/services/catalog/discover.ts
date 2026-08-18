// apps/api/src/services/catalog/discover.ts
/**
 * Naming: exposed as /api/discover/series, not /api/discover/tv — same
 * tv->series convention as #39/#35.
 *
 * "upcoming" status filter (2026-07-17): verified live against TMDB that
 * /discover/tv's with_status uses the same separator convention as
 * with_genres — comma is AND, pipe is OR. So "upcoming" (TMDB's
 * Planned/In Production/Pilot, codes 1/2/5) is safely expressed as the
 * pipe-joined string "1|2|5". No UI sends it yet; see #224.
 *
 * ─── One path, since #184 ───────────────────────────────────────────────
 *
 * There used to be two: a legacy single-region query and a personalized
 * multi-region one, chosen by whether `regions` arrived. Deselecting every
 * country made `regions` undefined, which fell into the legacy path — and that
 * path predates the personalized filters and applied none of them. A user who
 * asked to hide what they had watched was silently answered by code that had
 * never heard of the request.
 *
 * "No regions" is now a deliberate, valid state meaning "no country or
 * platform constraint", expressed as a single buffer that constrains nothing.
 * Same merge, same dedupe, same sort, same post-filters, one code path. The
 * only thing a region-less buffer does differently is omit two TMDB params.
 *
 * TMDB only accepts ONE watch_region per /discover call, but multiple
 * providers CAN be OR'd within a single call for that region
 * (with_watch_providers=8|337). So combining a user's ES+SE subscriptions
 * means ONE call per country, not one per provider.
 *
 * No-data-loss merge: each buffer has its own page cursor. Pages are fetched
 * (in parallel, one per still-open buffer) until the combined, deduped,
 * filtered count satisfies the requested page, every buffer is exhausted, or
 * the round budget runs out. Nothing fetched is discarded before being
 * considered — only excluded by an explicit filter, never dropped by an early
 * slice.
 *
 * AgeRating: /discover/movie has a native certification.lte +
 * certification_country filter — used directly, no extra calls. /discover/tv
 * has none, so series get a bounded post-filter: candidates that need it get
 * one /tv/{id}?append_to_response=content_ratings each, compared against
 * TMDB's own per-country ordering. Unrated series are let through and unrated
 * films are not, because TMDB's native filter returns only titles that have a
 * certification. That asymmetry is deliberate and recorded in #184.
 *
 * excludeWatched: movies is a plain set difference over ids. Series "fully
 * watched" needs number_of_seasons, which list items don't carry, so only
 * candidates the user has already started get a detail call — reusing the same
 * call as the age-rating check when both apply.
 */

import { fetchTmdb } from "@/lib/tmdb";
import { AppError } from "@/middleware/errorHandler";
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
  /** Required since #210: the endpoint is behind requireAuth. */
  userId: string;
  excludeWatched?: boolean;
  /** Absent or empty means no country or platform constraint. */
  regions?: RegionGroup[];
}

export type SeriesStatusFilter =
  "returning" | "ended" | "canceled" | "upcoming";

export interface SeriesDiscoverParams extends DiscoverParams {
  status?: SeriesStatusFilter;
}

const PAGE_SIZE = 20;

/**
 * The floor exists so `vote_average` means something: one 10/10 vote should not
 * outrank The Godfather. It only matters when the rating decides the order —
 * under popularity a three-vote film sinks on its own.
 *
 * Measured against TMDB (films by original language, #184):
 *
 *   votes >=   sv     es      en
 *   20        526   3,036  38,085
 *   50        204   1,398  22,592
 *   100       104     748  15,642
 *   300        42     215   8,819
 *
 * TMDB's own Top Rated uses 300, which would leave 42 Swedish films in
 * existence. Vote counts measure market size rather than quality, so any global
 * floor costs the smaller catalogue more — and since the feed merges three
 * languages, raising it doesn't empty the feed, it homogenises it. Even 50
 * costs Swedish 61% against English's 41%. The structural fix is
 * with_original_language (#223); a weighted Bayesian average would be better
 * still than any hard cut.
 */
const VOTE_FLOOR_DEFAULT = 20;
const VOTE_FLOOR_RATING_SORTED = 50;

/**
 * A round is one page fetched per still-open buffer. Without a region the query
 * has around 500 pages rather than the handful a provider-constrained one
 * returns, so a user who has watched a lot and asks to hide it could otherwise
 * walk the catalogue sequentially inside one request. Ten rounds, then answer
 * with what survived and let the client page on.
 */
const MAX_FETCH_ROUNDS = 10;

const STATUS_TO_TMDB_CODE: Record<SeriesStatusFilter, string> = {
  returning: "0",
  ended: "3",
  canceled: "4",
  upcoming: "1|2|5",
};

/**
 * TMDB's `adult` flag does not catch soft-core or erotic titles. Verified
 * against live data (2026-08-04): tv/233643, an explicit hentai series,
 * arrives with `adult: false` and ranks SECOND on page 1 for watch_region=SE.
 * Its TMDB keywords, however, are unambiguous.
 *
 * Only the two unambiguous keywords are excluded. Adding "erotic" (256466) was
 * measured and deliberately rejected: it raised exclusions from 9 to 39 series,
 * among them Mushoku Tensei, a mainstream isekai rated 8.5 with 1600+ votes.
 * Silently hiding legitimate catalogue from a discovery app is worse than the
 * problem being solved; users wanting a stricter cut have the age-rating filter.
 */
const EXCLUDED_KEYWORDS = [
  198385, // hentai
  155477, // softcore
].join("|");

const CONTENT_SAFETY_PARAMS = {
  // TMDB defaults this to false on /discover, but relying on an undocumented
  // default for a content-safety setting is fragile — state it.
  include_adult: false,
  // Inert today: TMDB returns a `softcore` boolean on every result but hasn't
  // populated it. Sent anyway so the filter starts working the day they do.
  // Do NOT remove as "unused".
  include_softcore: false,
  without_keywords: EXCLUDED_KEYWORDS,
} as const;

function voteFloor(params: DiscoverParams): number {
  if (params.voteCountMin !== undefined) return params.voteCountMin;
  const ratingDecidesOrder =
    params.sort === "rating" || params.minRating !== undefined;
  return ratingDecidesOrder ? VOTE_FLOOR_RATING_SORTED : VOTE_FLOOR_DEFAULT;
}

/**
 * A factory rather than a constant map because sorting by title needs the
 * user's language: `localeCompare` without one uses Node's default, which puts
 * Å and Ä in the wrong place in Swedish.
 */
function sortComparator(
  sort: DiscoverSort,
  locale: SupportedLocale,
): (a: NormalizedSearchResult, b: NormalizedSearchResult) => number {
  switch (sort) {
    case "rating":
      return (a, b) => (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0);
    case "release_date":
      return (a, b) => (b.year ?? 0) - (a.year ?? 0);
    case "title":
      return (a, b) => a.title.localeCompare(b.title, locale);
    case "popularity":
    default:
      return (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0);
  }
}

// ─── Buffers ─────────────────────────────────────────────────────────────

interface RegionBuffer {
  /** null means the one buffer that constrains nothing. */
  countryCode: string | null;
  providerIds: number[];
  items: NormalizedSearchResult[];
  nextPage: number;
  exhausted: boolean;
}

function initBuffers(regions: RegionGroup[] | undefined): RegionBuffer[] {
  const groups: Pick<RegionBuffer, "countryCode" | "providerIds">[] =
    regions?.length ? regions : [{ countryCode: null, providerIds: [] }];

  return groups.map((group) => ({
    countryCode: group.countryCode,
    providerIds: group.providerIds,
    items: [],
    nextPage: 1,
    exhausted: false,
  }));
}

/**
 * The whole of "no regions", in one place. Everything else in this file treats
 * the two cases identically, which is the point of #184.
 */
function regionParams(buffer: RegionBuffer) {
  return buffer.countryCode
    ? {
        watch_region: buffer.countryCode,
        with_watch_providers: buffer.providerIds.join("|"),
      }
    : {};
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

// ─── Page fetchers ───────────────────────────────────────────────────────

function fetchMoviePage(
  buffer: RegionBuffer,
  page: number,
  params: DiscoverParams,
): Promise<TmdbPaginatedResponse<TmdbSearchResultItem>> {
  return fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/movie",
    {
      ...CONTENT_SAFETY_PARAMS,
      ...regionParams(buffer),
      with_genres: params.genres?.join("|"),
      "primary_release_date.gte": params.yearFrom
        ? `${params.yearFrom}-01-01`
        : undefined,
      "primary_release_date.lte": params.yearTo
        ? `${params.yearTo}-12-31`
        : undefined,
      "vote_average.gte": params.minRating,
      "vote_count.gte": voteFloor(params),
      ...(params.ageRatingMax && params.ageRatingCountry
        ? {
            "certification.lte": params.ageRatingMax,
            certification_country: params.ageRatingCountry,
          }
        : {}),
      // Always fetched in TMDB popularity order; the user's chosen sort is
      // applied in memory after merging, so fetch order stays stable and the
      // buffers stay comparable across regions.
      sort_by: "popularity.desc",
      language: LOCALE_TO_TMDB_LANG[params.locale],
      page,
    },
  );
}

function fetchSeriesPage(
  buffer: RegionBuffer,
  page: number,
  params: SeriesDiscoverParams,
): Promise<TmdbPaginatedResponse<TmdbSearchResultItem>> {
  return fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/tv",
    {
      ...CONTENT_SAFETY_PARAMS,
      ...regionParams(buffer),
      with_genres: params.genres?.join("|"),
      "first_air_date.gte": params.yearFrom
        ? `${params.yearFrom}-01-01`
        : undefined,
      "first_air_date.lte": params.yearTo
        ? `${params.yearTo}-12-31`
        : undefined,
      "vote_average.gte": params.minRating,
      "vote_count.gte": voteFloor(params),
      with_status: params.status
        ? STATUS_TO_TMDB_CODE[params.status]
        : undefined,
      sort_by: "popularity.desc",
      language: LOCALE_TO_TMDB_LANG[params.locale],
      page,
    },
  );
}

// ─── The shared collector ────────────────────────────────────────────────

interface CollectOptions {
  buffers: RegionBuffer[];
  page: number;
  sort: DiscoverSort;
  locale: SupportedLocale;
  mediaType: "movie" | "series";
  fetchPage: (
    buffer: RegionBuffer,
    page: number,
  ) => Promise<TmdbPaginatedResponse<TmdbSearchResultItem>>;
  survive: (
    items: NormalizedSearchResult[],
  ) => NormalizedSearchResult[] | Promise<NormalizedSearchResult[]>;
}

/**
 * One loop instead of the nested pair this replaces. Each turn fetches one page
 * per open buffer, merges, sorts and filters, and stops when the requested page
 * is covered, every buffer is spent, or the round budget is gone.
 *
 * Movies and series differ only in `fetchPage` and `survive`, which is why they
 * share this rather than each keeping their own copy of the same seventeen
 * lines.
 */
async function collectPage({
  buffers,
  page,
  sort,
  locale,
  mediaType,
  fetchPage,
  survive,
}: CollectOptions): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const target = page * PAGE_SIZE;
  const compare = sortComparator(sort, locale);

  let survivors = await survive(dedupeAndMerge(buffers).sort(compare));
  let rounds = 0;

  while (
    survivors.length < target &&
    buffers.some((buffer) => !buffer.exhausted) &&
    rounds < MAX_FETCH_ROUNDS
  ) {
    await Promise.all(
      buffers
        .filter((buffer) => !buffer.exhausted)
        .map(async (buffer) => {
          const response = await fetchPage(buffer, buffer.nextPage);
          buffer.items.push(
            ...extractRecommendations(response, mediaType, PAGE_SIZE),
          );
          buffer.nextPage += 1;
          buffer.exhausted = buffer.nextPage > response.total_pages;
        }),
    );
    rounds += 1;
    survivors = await survive(dedupeAndMerge(buffers).sort(compare));
  }

  const start = (page - 1) * PAGE_SIZE;
  const results = survivors.slice(start, start + PAGE_SIZE);

  // A page the budget could not fill is the end of what this request can
  // honestly offer. Every request starts with empty buffers, so a deep page
  // has to be reached from scratch within MAX_FETCH_ROUNDS — and when that
  // runs out, the remaining TMDB pages say nothing about whether *this*
  // request could ever have got there. Reporting more on the strength of them
  // handed the client an empty page and an invitation to ask again, forever
  // (#227).
  const hasMore =
    results.length === PAGE_SIZE &&
    (survivors.length > start + PAGE_SIZE ||
      buffers.some((buffer) => !buffer.exhausted));

  return {
    results,
    // Approximate on purpose: the merged-and-filtered count so far, not a true
    // total across regions, which TMDB cannot give for a query it never ran as
    // one. `totalPages` is what the client paginates on.
    totalResults: survivors.length,
    totalPages: hasMore ? page + 1 : page,
    page,
  };
}

// ─── Watched lookups ─────────────────────────────────────────────────────

async function loadWatchedMovieIds(userId: string): Promise<Set<number>> {
  const rows = await prisma.watchedItem.findMany({
    where: { userId, mediaType: "movie", seasonNumber: null },
    select: { tmdbId: true },
  });
  return new Set(rows.map((r) => r.tmdbId));
}

/**
 * tmdbId -> count of distinct watched seasons, for the fully-watched check.
 * Season 0 is TMDB's specials bucket and is deliberately skipped:
 * number_of_seasons doesn't include it, so counting it would mark a series as
 * finished while a real season is still unwatched.
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

// ─── Entry points ────────────────────────────────────────────────────────

export async function discoverMovies(
  params: DiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const excludeWatched = !!params.excludeWatched;
  const watchedIds = excludeWatched
    ? await loadWatchedMovieIds(params.userId)
    : new Set<number>();

  return collectPage({
    buffers: initBuffers(params.regions),
    page: params.page,
    sort: params.sort,
    locale: params.locale,
    mediaType: "movie",
    fetchPage: (buffer, page) => fetchMoviePage(buffer, page, params),
    survive: (items) =>
      excludeWatched ? items.filter((item) => !watchedIds.has(item.id)) : items,
  });
}

export async function discoverSeries(
  params: SeriesDiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const excludeWatched = !!params.excludeWatched;
  const watchedSeasonCounts = excludeWatched
    ? await loadWatchedSeriesSeasonCounts(params.userId)
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

  // A filter that cannot resolve its own threshold used to excuse itself and
  // let everything through, which is indistinguishable from working. The
  // client asked for a certification that does not exist in the country it also
  // sent, so this is a 400 rather than a shrug.
  if (needsAgeRatingCheck && ageRatingMaxOrder === undefined) {
    throw new AppError(
      `Unknown series certification "${params.ageRatingMax}" for country "${params.ageRatingCountry}"`,
      400,
    );
  }

  /**
   * Decisions are memoised by id across rounds. Without it the round budget
   * would protect the wrong thing: ten rounds would mean re-fetching detail for
   * every already-judged candidate ten times.
   */
  const decided = new Map<number, boolean>();

  async function decide(item: NormalizedSearchResult): Promise<boolean> {
    const cached = decided.get(item.id);
    if (cached !== undefined) return cached;

    const watchedSeasons = watchedSeasonCounts.get(item.id) ?? 0;
    const needsDetail =
      needsAgeRatingCheck || (excludeWatched && watchedSeasons > 0);

    if (!needsDetail) {
      decided.set(item.id, true);
      return true;
    }

    const detail = await fetchTmdb<TmdbSeries>(`/tv/${item.id}`, {
      append_to_response: "content_ratings",
    });

    let keep = true;

    if (
      excludeWatched &&
      watchedSeasons > 0 &&
      watchedSeasons >= detail.number_of_seasons
    ) {
      keep = false;
    }

    if (keep && needsAgeRatingCheck) {
      const rating = extractSeriesCertificationForCountry(
        detail.content_ratings,
        params.ageRatingCountry!,
      );
      const ratingOrder = rating ? ageRatingOrderMap.get(rating) : undefined;
      // Unrated is let through rather than excluded: TMDB's series
      // certification coverage is patchy, and hiding unrated shows would remove
      // a lot of legitimate catalogue. Films behave the opposite way, because
      // TMDB's native filter only returns titles that have a certification.
      // The asymmetry is deliberate — see #184.
      if (ratingOrder !== undefined && ratingOrder > ageRatingMaxOrder!) {
        keep = false;
      }
    }

    decided.set(item.id, keep);
    return keep;
  }

  return collectPage({
    buffers: initBuffers(params.regions),
    page: params.page,
    sort: params.sort,
    locale: params.locale,
    mediaType: "series",
    fetchPage: (buffer, page) => fetchSeriesPage(buffer, page, params),
    // Decide in parallel, then filter in the original order. Pushing into a
    // shared array from inside Promise.all ordered the result by completion
    // time instead: items needing no detail call resolved synchronously and
    // landed first, while every item that needed one arrived after its round
    // trip. Those are precisely the partially watched series, pushed to the end
    // of the merged list and off the first page — which looked exactly like the
    // fully-watched filter hiding them.
    survive: async (items) => {
      const keeps = await Promise.all(items.map(decide));
      return items.filter((_, index) => keeps[index]);
    },
  });
}
