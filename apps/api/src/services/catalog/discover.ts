// apps/api/src/services/discover.ts
/**
 * Naming: exposed as /api/discover/series, not /api/discover/tv (ticket's
 * literal text) — same tv->series convention as #39/#35.
 *
 * "upcoming" status filter (2026-07-17): verified live against TMDB that
 * /discover/tv's with_status uses the same separator convention as
 * with_genres — comma is AND (with_status=1,2,5 returned 0 results, since a
 * show can't hold three statuses at once), pipe is OR
 * (with_status=1|2|5 returned ~4093 total_results, matching the sum of the
 * three individual queries: 805+2876+410=4091). So "upcoming" (TMDB's
 * Planned/In Production/Pilot, codes 1/2/5) is safely expressed as the
 * pipe-joined string "1|2|5".
 *
 * Reuses `extractRecommendations` from tmdbMedia.ts for the response
 * normalization — its signature (TmdbPaginatedResponse<TmdbSearchResultItem>,
 * MediaType) -> NormalizedSearchResult[] already does exactly what discover
 * needs (discover/movie and discover/tv results carry no media_type field,
 * so a fixed mediaType per call is correct, same as recommendations).
 * It's doing more than its name suggests now (movies.ts, tv.ts,
 * discover.ts) — worth a rename to something like `normalizeMediaResults`
 * at some point, not urgent.
 */

import { fetchTmdb } from "@/lib/tmdb";
import { extractRecommendations } from "@/helpers/tmdbMedia";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";
import type {
  NormalizedSearchResult,
  PaginatedResponse,
  SupportedLocale,
} from "@foundit/types";
import type {
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
} from "@/types/tmdb.types";

export type DiscoverSort = "popularity" | "rating" | "release_date";

export interface DiscoverParams {
  genre?: number;
  year?: number;
  minRating?: number;
  provider?: number;
  region?: string;
  sort: DiscoverSort;
  locale: SupportedLocale;
  page: number;
}

export type SeriesStatusFilter =
  | "returning"
  | "ended"
  | "canceled"
  | "upcoming";

export interface SeriesDiscoverParams extends DiscoverParams {
  status?: SeriesStatusFilter;
}

const SORT_TO_TMDB_MOVIE: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  release_date: "primary_release_date.desc",
};

const SORT_TO_TMDB_SERIES: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  release_date: "first_air_date.desc",
};

// TMDB's own with_status codes: 0=Returning Series, 1=Planned,
// 2=In Production, 3=Ended, 4=Canceled, 5=Pilot. "upcoming" is our own
// bucket folding 1/2/5 together (verified: pipe-joined = OR on this param).
const STATUS_TO_TMDB_CODE: Record<SeriesStatusFilter, string> = {
  returning: "0",
  ended: "3",
  canceled: "4",
  upcoming: "1|2|5",
};

type TmdbDiscoverParams = Record<string, string | number | boolean | undefined>;

function buildBaseParams(
  params: DiscoverParams,
  sortMap: Record<DiscoverSort, string>,
): TmdbDiscoverParams {
  return {
    with_genres: params.genre,
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
    results: extractRecommendations(response, mediaType),
    totalResults: response.total_results,
    totalPages: response.total_pages,
    page: response.page,
  };
}

export async function discoverMovies(
  params: DiscoverParams,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const tmdbParams: TmdbDiscoverParams = {
    ...buildBaseParams(params, SORT_TO_TMDB_MOVIE),
    primary_release_year: params.year,
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
  const tmdbParams: TmdbDiscoverParams = {
    ...buildBaseParams(params, SORT_TO_TMDB_SERIES),
    first_air_date_year: params.year,
    with_status: params.status ? STATUS_TO_TMDB_CODE[params.status] : undefined,
  };

  const response = await fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    "/discover/tv",
    tmdbParams,
  );
  return toPaginated(response, "series");
}
