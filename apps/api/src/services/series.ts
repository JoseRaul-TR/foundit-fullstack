// apps/api/src/services/series.ts

import type {
  Genre,
  NormalizedSearchResult,
  SupportedLocale,
} from "@foundit/types";
import {
  parseYear,
  extractTrailer,
  extractCast,
  extractRecommendations,
  buildProviders,
  type NormalizedCastMember,
  type ProvidersByType,
  collectSubscribedNames,
} from "@/helpers/tmdbMedia";
import prisma from "@/lib/prisma";
import { fetchTmdbWithFallback } from "@/lib/tmdb";
import type { TmdbSeasonDetail, TmdbSeries } from "@/types/tmdb.types";

const SERIES_APPEND_TO_RESPONSE =
  "credits,videos,recommendations,watch/providers";

interface SeriesDetailUser {
  inWatchlist: boolean;
  watched: boolean;
  rating: number | null;
}

interface SeriesSeasonSummary {
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  watched?: boolean;
}

export interface SeriesDetailResponse {
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  genres: Genre[];
  runtime: null; // TMDB has no single "runtime" for a series; kept for shape parity with #38
  tmdbRating: number | null;
  voteCount: number | null;
  trailer: { youtubeKey: string } | null;
  cast: NormalizedCastMember[];
  providers: Record<string, ProvidersByType>;
  recommendations: NormalizedSearchResult[];
  user: SeriesDetailUser | null;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: "returning" | "ended" | "canceled" | "upcoming";
  seasons: SeriesSeasonSummary[];
  newSeasonsAvailable: boolean;
  availableOn: string[];
}

/**
 * TMDB's real `status` values: "Returning Series", "Planned", "In Production",
 * "Ended", "Canceled", "Pilot". We only expose 3 buckets. "Planned" /
 * "In Production" / "Pilot" (show hasn't premiered / isn't finished) fall
 * back to "returning" since neither "ended" nor "canceled" fit — flag if you
 * want a 4th "upcoming" bucket instead of folding those into "returning".
 */
export function toSeriesStatus(
  tmdbStatus: string,
): "returning" | "ended" | "canceled" | "upcoming" {
  switch (tmdbStatus) {
    case "Returning Series":
      return "returning";
    case "Ended":
      return "ended";
    case "Canceled":
      return "canceled";
    case "Planned":
    case "In Production":
    case "Pilot":
      return "upcoming";
    default:
      return "upcoming";
  }
}

interface SeriesUserContext {
  subscribedSet: Set<string>;
  inWatchlist: boolean;
  watchedSeasonNumbers: Set<number>;
  rating: number | null;
}

/**
 * Same parallel-fetch pattern as movies.ts's loadUserContext, but pulls
 * every watched season row for this show (not just a single boolean) so we
 * can both mark per-season `watched` and compute the max watched season for
 * the new-season check.
 */
async function loadUserContext(
  userId: string,
  tmdbId: number,
): Promise<SeriesUserContext> {
  const [services, watchlistItem, watchedSeasons, rating] = await Promise.all([
    prisma.userStreamingService.findMany({ where: { userId } }),
    prisma.watchlistItem.findFirst({
      where: { userId, tmdbId, mediaType: "series" },
    }),
    prisma.watchedItem.findMany({
      where: { userId, tmdbId, mediaType: "series" },
    }),
    prisma.userRating.findFirst({
      where: { userId, tmdbId, mediaType: "series" },
    }),
  ]);

  return {
    subscribedSet: new Set(
      services.map((s) => `${s.countryCode}:${s.providerId}`),
    ),
    inWatchlist: watchlistItem !== null,
    watchedSeasonNumbers: new Set(
      watchedSeasons
        .map((w) => w.seasonNumber)
        .filter((n): n is number => n !== null),
    ),
    rating: rating?.rating ?? null,
  };
}

export async function getSeriesDetail(
  tmdbId: number,
  locale: SupportedLocale,
  userId: string | null,
): Promise<SeriesDetailResponse> {
  const series = await fetchTmdbWithFallback<TmdbSeries>(
    `/tv/${tmdbId}`,
    { append_to_response: SERIES_APPEND_TO_RESPONSE },
    locale,
  );

  let subscribedSet: Set<string> | null = null;
  let user: SeriesDetailUser | null = null;
  let watchedSeasonNumbers: Set<number> | null = null;

  if (userId) {
    const context = await loadUserContext(userId, tmdbId);
    subscribedSet = context.subscribedSet;
    watchedSeasonNumbers = context.watchedSeasonNumbers;
    user = {
      inWatchlist: context.inWatchlist,
      watched: context.watchedSeasonNumbers.size > 0,
      rating: context.rating,
    };
  }

  const seasons: SeriesSeasonSummary[] = (series.seasons ?? []).map(
    (season) => ({
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
      airDate: season.air_date,
      posterPath: season.poster_path,
      // Unauthenticated users get no `watched` key at all (acceptance criteria),
      // not `watched: false` — those aren't the same claim.
      ...(watchedSeasonNumbers
        ? { watched: watchedSeasonNumbers.has(season.season_number) }
        : {}),
    }),
  );

  const providers = buildProviders(
    series["watch/providers"]?.results,
    subscribedSet,
  );
  const status = toSeriesStatus(series.status);

  // New-season detection. Ticket text: "if numberOfSeasons > max watched
  // season" — read completely literally, a user who has NEVER watched this
  // show would have "max watched season" = nothing, and every returning show
  // would show newSeasonsAvailable. That seems like an oversight in the spec:
  // the badge only makes product sense for shows the user is already
  // following. So this requires at least one watched season first.
  let newSeasonsAvailable = false;
  let availableOn: string[] = [];

  if (
    watchedSeasonNumbers &&
    watchedSeasonNumbers.size > 0 &&
    status === "returning"
  ) {
    const maxWatchedSeason = Math.max(...watchedSeasonNumbers);
    if (series.number_of_seasons > maxWatchedSeason) {
      const subscribedNames = collectSubscribedNames(providers);
      if (subscribedNames.length > 0) {
        newSeasonsAvailable = true;
        availableOn = subscribedNames;
      }
    }
  }

  return {
    id: series.id,
    title: series.name,
    overview: series.overview ?? null,
    posterPath: series.poster_path ?? null,
    backdropPath: series.backdrop_path ?? null,
    releaseYear: parseYear(series.first_air_date),
    genres: series.genres ?? [],
    runtime: null,
    tmdbRating: series.vote_average ?? null,
    voteCount: series.vote_count ?? null,
    trailer: extractTrailer(series.videos),
    cast: extractCast(series.credits),
    providers,
    recommendations: extractRecommendations(series.recommendations, "series"),
    user,
    numberOfSeasons: series.number_of_seasons,
    numberOfEpisodes: series.number_of_episodes,
    status,
    seasons,
    newSeasonsAvailable,
    availableOn,
  };
}

export interface SeriesEpisodeSummary {
  episodeNumber: number;
  title: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
}

export interface SeriesSeasonDetailResponse {
  seasonNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  episodeCount: number;
  posterPath: string | null;
  episodes: SeriesEpisodeSummary[];
}

/**
 * No append_to_response needed — /tv/:id/season/:n already returns the full
 * episode list on its own. Uses fetchTmdbWithFallback (not plain fetchTmdb)
 * because season overview is frequently empty outside en-US on TMDB, same
 * reasoning as movies/series detail. Note this only backfills the
 * season-level overview, not each episode's overview individually — same
 * limitation as cast/crew names elsewhere.
 *
 * Invalid season number (out of range for the show) isn't checked here:
 * TMDB itself 404s for it, which fetchTmdbWithFallback already surfaces as
 * a 404 AppError, satisfying the ticket's acceptance criterion directly.
 */
export async function getSeriesSeasonDetail(
  tmdbId: number,
  seasonNumber: number,
  locale: SupportedLocale,
): Promise<SeriesSeasonDetailResponse> {
  const season = await fetchTmdbWithFallback<TmdbSeasonDetail>(
    `/tv/${tmdbId}/season/${seasonNumber}`,
    {},
    locale,
  );

  return {
    seasonNumber: season.season_number,
    name: season.name,
    overview: season.overview || null,
    airDate: season.air_date,
    episodeCount: season.episodes.length,
    posterPath: season.poster_path,
    episodes: season.episodes.map((episode) => ({
      episodeNumber: episode.episode_number,
      title: episode.name,
      overview: episode.overview,
      airDate: episode.air_date,
      runtime: episode.runtime,
    })),
  };
}
