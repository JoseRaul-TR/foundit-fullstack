// apps/api/src/services/discover.ts

import {
  LOCALE_TO_TMDB_LANG,
  type NormalizedSearchResult,
  type PaginatedResponse,
  type SupportedLocale,
} from "@foundit/types";
import { extractRecommendations } from "@/helpers/tmdbMedia";
import { fetchTmdb } from "@/lib/tmdb";
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

export type SeriesStatusFilter = "returning" | "ended" | "canceled";

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

// TMDB's own numeric with_status codes (0=Returning Series, 1=Planned,
// 2=In Production, 3=Ended, 4=Canceled, 5=Pilot) — only the 3 the ticket
// asks for are exposed as a filter.
const STATUS_TO_TMDB_CODE: Record<SeriesStatusFilter, number> = {
  returning: 0,
  ended: 3,
  canceled: 4,
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
