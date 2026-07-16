// apps/api/src/services/search.ts
import {
  LOCALE_TO_TMDB_LANG,
  type NormalizedSearchResult,
  type PaginatedResponse,
  type SupportedLocale,
} from "@foundit/types";
import { parseYear } from "@/helpers/tmdbMedia";
import { fetchTmdb } from "@/lib/tmdb";
import type {
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
} from "@/types/tmdb.types";

export type SearchType = "multi" | "movie" | "series" | "person";

const TYPE_TO_TMDB_PATH: Record<SearchType, string> = {
  multi: "multi",
  movie: "movie",
  series: "tv",
  person: "person",
};

/**
 * /search/multi results carry `media_type` per item ("movie"/"tv"/"person").
 * /search/movie, /search/series, /search/person results don't — the type is
 * implied by the endpoint, so we fall back to whatever the caller asked for.
 */
function toMediaType(
  tmdbMediaType: string | undefined,
  requestedType: SearchType,
): "movie" | "series" | "person" {
  const raw = tmdbMediaType ?? requestedType;
  return raw === "tv" ? "series" : (raw as "movie" | "series" | "person");
}

export async function searchTmdb(
  query: string,
  type: SearchType,
  locale: SupportedLocale,
  page: number,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const response = await fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    `/search/${TYPE_TO_TMDB_PATH[type]}`,
    {
      query,
      language: LOCALE_TO_TMDB_LANG[locale],
      page,
    },
  );

  const results: NormalizedSearchResult[] = response.results.map((item) => ({
    id: item.id,
    mediaType: toMediaType(item.media_type, type),
    title: item.title ?? item.name ?? "",
    // Person results have profile_path, not poster_path — fall back to it.
    posterPath: item.poster_path ?? item.profile_path ?? null,
    year: parseYear(item.release_date ?? item.first_air_date),
    tmdbRating: item.vote_average ?? null,
  }));

  return {
    results,
    totalResults: response.total_results,
    totalPages: response.total_pages,
    page: response.page,
  };
}
