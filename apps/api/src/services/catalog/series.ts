// apps/api/src/services/catalog/series.ts

import type {
  SeriesDetailResponse,
  SeriesDetailUser,
  SeriesSeasonDetailResponse,
  SeriesSeasonSummary,
  SeriesStatus,
  SupportedLocale,
} from "@foundit/types";
import {
  parseYear,
  extractTrailer,
  extractCast,
  extractRecommendations,
  buildProviders,
  collectSubscribedNames,
} from "@/helpers/tmdbMedia";
import prisma from "@/lib/prisma";
import { fetchTmdbWithFallback } from "@/lib/tmdb";
import type { TmdbSeasonDetail, TmdbSeries } from "@/types/tmdb.types";

const SERIES_APPEND_TO_RESPONSE =
  "credits,videos,recommendations,watch/providers";

export function toSeriesStatus(tmdbStatus: string): SeriesStatus {
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
