// apps/api/src/services/search.ts
/**
 * Two deliberate deviations from the ticket text, flagged for José:
 *  - `type` uses "series" instead of TMDB's "tv", per the 2026-07-15
 *    tv->series naming decision. TMDB's own path (/search/tv) is
 *    unaffected — only our query param value changed.
 *  - `lang` takes our SupportedLocale ("en"/"es"/"sv"), mapped internally
 *    via LOCALE_TO_TMDB_LANG, same as #38/#39 — not a raw TMDB language
 *    code as the ticket literally says. Keeps the whole API's `lang`
 *    param consistent. One-line change in the route if you want the
 *    literal ticket behavior instead.
 *
 * No fetchTmdbWithFallback here: search results don't carry overview/
 * biography text, so there's nothing for the language-fallback merge
 * to backfill — a plain fetchTmdb is enough.
 */

import { fetchTmdb } from "@/lib/tmdb";
import type {
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
} from "@/types/tmdb.types";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";
import type {
  NormalizedSearchResult,
  PaginatedResponse,
  SupportedLocale,
} from "@foundit/types";
import { parseYear } from "@/helpers/tmdbMedia";

export type SearchType = "multi" | "movie" | "series" | "person";

const TYPE_TO_TMDB_PATH: Record<SearchType, string> = {
  multi: "multi",
  movie: "movie",
  series: "tv", // TMDB's own path segment; unrelated to our "series" naming
  person: "person",
};

/**
 * /search/multi results carry `media_type` per item ("movie"/"tv"/"person").
 * /search/movie, /search/tv, /search/person results don't — the type is
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
