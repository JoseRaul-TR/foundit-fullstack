// apps/api/src/services/movies.ts
import prisma from "src/lib/prisma";
import { fetchTmdbWithFallback } from "src/lib/tmdb";
import type {
  TmdbMovie,
  TmdbWatchProviderEntry,
  TmdbWatchProvidersCountry,
} from "src/types/tmdb.types";
import type {
  Genre,
  Provider,
  ProviderType,
  NormalizedSearchResult,
  SupportedLocale,
} from "@foundit/types";

const MOVIE_APPEND_TO_RESPONSE =
  "credits,videos,recommendations,watch/providers";
const MAX_CAST = 10;
const MAX_RECOMMENDATIONS = 10;

interface ProvidersByType {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  free: Provider[];
}

interface MovieCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

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
  cast: MovieCastMember[];
  providers: Record<string, ProvidersByType>;
  recommendations: NormalizedSearchResult[];
  user: MovieDetailUser | null;
}

function parseYear(dateString: string | undefined | null): number | null {
  if (!dateString) return null;
  const year = Number(dateString.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

function extractTrailer(
  videos: TmdbMovie["videos"],
): { youtubeKey: string } | null {
  const trailer = videos?.results.find(
    (v) => v.type === "Trailer" && v.site === "YouTube",
  );
  return trailer ? { youtubeKey: trailer.key } : null;
}

function extractCast(credits: TmdbMovie["credits"]): MovieCastMember[] {
  return (credits?.cast ?? []).slice(0, MAX_CAST).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path,
  }));
}

function extractRecommendations(
  recommendations: TmdbMovie["recommendations"],
): NormalizedSearchResult[] {
  return (recommendations?.results ?? [])
    .slice(0, MAX_RECOMMENDATIONS)
    .map((item) => ({
      id: item.id,
      mediaType: "movie",
      title: item.title ?? item.name ?? "",
      posterPath: item.poster_path,
      year: parseYear(item.release_date ?? item.first_air_date),
      tmdbRating: item.vote_average ?? null,
    }));
}

/**
 * TMDB's `logo_path` can be null; our shared `Provider.logoPath` is typed as
 * a required string, so we default to "" rather than widen the shared type.
 * Flag this to José if it ever needs to become string | null instead.
 */
function toProvider(
  entry: TmdbWatchProviderEntry,
  type: ProviderType,
  countryCode: string,
  subscribedSet: Set<string> | null,
): Provider {
  const isSubscribed =
    subscribedSet?.has(`${countryCode}:${entry.provider_id}`) ?? false;

  return {
    providerId: entry.provider_id,
    name: entry.provider_name,
    logoPath: entry.logo_path ?? "",
    type,
    ...(isSubscribed ? { subscribed: true } : {}),
  };
}

function buildProviders(
  tmdbProviders: Record<string, TmdbWatchProvidersCountry> | undefined,
  subscribedSet: Set<string> | null,
): Record<string, ProvidersByType> {
  const providers: Record<string, ProvidersByType> = {};
  if (!tmdbProviders) return providers;

  for (const [countryCode, byType] of Object.entries(tmdbProviders)) {
    providers[countryCode] = {
      flatrate: (byType.flatrate ?? []).map((p) =>
        toProvider(p, "flatrate", countryCode, subscribedSet),
      ),
      rent: (byType.rent ?? []).map((p) =>
        toProvider(p, "rent", countryCode, subscribedSet),
      ),
      buy: (byType.buy ?? []).map((p) =>
        toProvider(p, "buy", countryCode, subscribedSet),
      ),
      free: (byType.free ?? []).map((p) =>
        toProvider(p, "free", countryCode, subscribedSet),
      ),
    };
  }

  return providers;
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
    recommendations: extractRecommendations(movie.recommendations),
    user,
  };
}
