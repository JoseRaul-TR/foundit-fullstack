// apps/api/src/services/movies.ts
import prisma from "@/lib/prisma";
import { fetchTmdbWithFallback } from "@/lib/tmdb";
import type { TmdbMovie } from "@/types/tmdb.types";
import type {
  Genre,
  NormalizedSearchResult,
  SupportedLocale,
} from "@foundit/types";
import {
  buildProviders,
  extractCast,
  extractRecommendations,
  extractTrailer,
  type NormalizedCastMember,
  parseYear,
  type ProvidersByType,
} from "@/helpers/tmdbMedia";

const MOVIE_APPEND_TO_RESPONSE =
  "credits,videos,recommendations,watch/providers";

interface MovieDetailUser {
  inWatchlist: boolean;
  watched: boolean;
  rating: number | null;
}

export interface MovieDetailResponse {
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  genres: Genre[];
  runtime: number | null;
  tmdbRating: number | null;
  voteCount: number | null;
  trailer: { youtubeKey: string } | null;
  cast: NormalizedCastMember[];
  providers: Record<string, ProvidersByType>;
  recommendations: NormalizedSearchResult[];
  user: MovieDetailUser | null;
}

/**
 * Fetches everything the authenticated user needs for the highlight logic.
 * Runs as a single Promise.all so the 4 lookups happen in parallel.
 * Movies always have seasonNumber = null in WatchedItem — filtered
 * explicitly so this can never collide with a TV season row.
 */
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
    trailer: extractTrailer(movie.videos),
    cast: extractCast(movie.credits),
    providers: buildProviders(movie["watch/providers"]?.results, subscribedSet),
    recommendations: extractRecommendations(movie.recommendations, "movie"),
    user,
  };
}
