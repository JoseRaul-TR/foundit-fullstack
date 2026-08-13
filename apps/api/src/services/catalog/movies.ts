// apps/api/src/services/catalog/movies.ts

import prisma from "@/lib/prisma";
import { fetchTmdb, fetchTmdbWithFallback } from "@/lib/tmdb";
import { PAGE_SIZE } from "@/config/constants";
import type {
  TmdbMovie,
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
} from "@/types/tmdb.types";
import {
  LOCALE_TO_TMDB_LANG,
  type MovieDetailResponse,
  type MovieDetailUser,
  type NormalizedSearchResult,
  type PaginatedResponse,
  type SupportedLocale,
} from "@foundit/types";
import {
  buildProviders,
  extractCast,
  extractCrew,
  extractRecommendations,
  extractTrailer,
  extractMovieAgeRating,
  parseYear,
  extractDirectors,
} from "@/helpers/tmdbMedia";

const MOVIE_APPEND_TO_RESPONSE =
  "credits,videos,recommendations,watch/providers,release_dates";

async function loadUserContext(
  userId: string,
  tmdbId: number,
): Promise<MovieDetailUser & { subscribedSet: Set<string> }> {
  const [services, watchlistItem, watchedItem, rating] = await Promise.all([
    prisma.userStreamingService.findMany({ where: { userId } }),
    prisma.watchlistItem.findFirst({
      where: { userId, tmdbId, mediaType: "movie" },
    }),
    prisma.watchedItem.findFirst({
      where: { userId, tmdbId, mediaType: "movie", seasonNumber: null },
    }),
    prisma.userRating.findFirst({
      where: { userId, tmdbId, mediaType: "movie" },
    }),
  ]);

  return {
    subscribedSet: new Set(
      services.map((s) => `${s.countryCode}:${s.providerId}`),
    ),
    inWatchlist: watchlistItem !== null,
    watched: watchedItem !== null,
    rating: rating?.rating ?? null,
  };
}

export async function getMovieDetail(
  tmdbId: number,
  locale: SupportedLocale,
  userId: string | null,
): Promise<MovieDetailResponse> {
  const movie = await fetchTmdbWithFallback<TmdbMovie>(
    `/movie/${tmdbId}`,
    { append_to_response: MOVIE_APPEND_TO_RESPONSE },
    locale,
  );

  let subscribedSet: Set<string> | null = null;
  let user: MovieDetailUser | null = null;

  if (userId) {
    const context = await loadUserContext(userId, tmdbId);
    subscribedSet = context.subscribedSet;
    user = {
      inWatchlist: context.inWatchlist,
      watched: context.watched,
      rating: context.rating,
    };
  }

  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview ?? null,
    posterPath: movie.poster_path ?? null,
    backdropPath: movie.backdrop_path ?? null,
    releaseYear: parseYear(movie.release_date),
    genres: movie.genres ?? [],
    runtime: movie.runtime ?? null,
    tmdbRating: movie.vote_average ?? null,
    voteCount: movie.vote_count ?? null,
    ageRating: extractMovieAgeRating(movie.release_dates, locale),
    trailer: extractTrailer(movie.videos),
    cast: extractCast(movie.credits),
    crew: extractCrew(movie.credits),
    directedBy: extractDirectors(movie.credits),
    providers: buildProviders(movie["watch/providers"]?.results, subscribedSet),
    recommendations: extractRecommendations(movie.recommendations, "movie"),
    recommendationsHasMore: (movie.recommendations?.total_pages ?? 1) > 1,
    user,
  };
}

/**
 * Page 2 onwards. Page 1 already travels inside the detail response via
 * append_to_response, so this is only ever called after the user has scrolled
 * to the end of the row — no cost for the majority who never do.
 *
 * fetchTmdb, not fetchTmdbWithFallback: the fallback exists to re-request a
 * record whose translated text came back empty, and it's typed for exactly
 * that shape. A page of results has no text of its own — any gap would be in
 * an individual item — so the language has to be mapped here instead, the same
 * way discover.ts does for its own list calls.
 */
export async function getMovieRecommendations(
  tmdbId: number,
  locale: SupportedLocale,
  page: number,
): Promise<PaginatedResponse<NormalizedSearchResult>> {
  const response = await fetchTmdb<TmdbPaginatedResponse<TmdbSearchResultItem>>(
    `/movie/${tmdbId}/recommendations`,
    { page, language: LOCALE_TO_TMDB_LANG[locale] },
  );

  return {
    results: extractRecommendations(response, "movie", PAGE_SIZE),
    totalResults: response.total_results,
    totalPages: response.total_pages,
    page: response.page,
  };
}
