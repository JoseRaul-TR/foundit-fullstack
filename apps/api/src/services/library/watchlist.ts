//apps/api/src/services/library/watchlist.ts

/**
 * `year` is cached on WatchlistItem at add-time so the DB can ORDER BY a
 * column it has. `title` was cached for the same reason and removed in #234:
 * the displayed titles are localised (#189) while the stored one was English
 * by construction, so ordering by it ordered by something the user cannot
 * see — and ordering by the localised title needs the whole list in memory,
 * which is the cost pagination exists to avoid. `year` survives because it is
 * the same number in every language.
 *
 * The client still requests every page and flattens the result, so a render
 * still enriches the whole list rather than one page of 20. That is the other
 * half of #234 and it lands with the client change; this note is here so the
 * `skip`/`take` below is not read as something already in use.
 *
 * newSeasonsAvailable reuses the exact same compound condition as #39's
 * series detail (status must be "returning", user must have watched at
 * least one season already, and the new season must be available on a
 * subscribed service) — same feature, same semantics, just surfaced here
 * too.
 */
import {
  LOCALE_TO_TMDB_LANG,
  type MediaType,
  type PaginatedResponse,
  type SupportedLocale,
  type WatchlistHighlightService,
  type WatchlistItemHighlight,
  type WatchlistItemResponse,
  type WatchlistItemTmdbInfo,
  type WatchlistSort,
  type WatchlistTypeFilter,
} from "@foundit/types";
import {
  buildProviders,
  collectSubscribedServices,
  extractTitle,
  extractYear,
  fetchMediaRaw,
} from "@/helpers/tmdbMedia";
import { PAGE_SIZE } from "@/config/constants";
import prisma from "@/lib/prisma";
import { toSeriesStatus } from "@/services/catalog/series";
import type { TmdbMovie, TmdbSeries } from "@/types/tmdb.types";
import { AppError } from "@/middleware/errorHandler";

export interface WatchlistQuery {
  type: WatchlistTypeFilter;
  sort: WatchlistSort;
  locale: SupportedLocale;
  page: number;
}

export interface AddWatchlistInput {
  tmdbId: number;
  mediaType: MediaType;
}

interface WatchlistRow {
  id: string;
  tmdbId: number;
  mediaType: string;
  createdAt: Date;
}

function fetchRawTmdb(
  tmdbId: number,
  mediaType: MediaType,
  language: string,
): Promise<TmdbMovie | TmdbSeries> {
  return fetchMediaRaw(tmdbId, mediaType, {
    append_to_response: "watch/providers",
    language,
  });
}

function buildTmdbInfoAndHighlight(
  mediaType: MediaType,
  raw: TmdbMovie | TmdbSeries,
  subscribedSet: Set<string>,
): { tmdb: WatchlistItemTmdbInfo; highlight: WatchlistItemHighlight } {
  const title = extractTitle(mediaType, raw);
  const year = extractYear(mediaType, raw);
  const providers = buildProviders(
    raw["watch/providers"]?.results,
    subscribedSet,
  );
  const services = collectSubscribedServices(providers);

  return {
    tmdb: {
      title,
      posterPath: raw.poster_path,
      year,
      tmdbRating: raw.vote_average ?? null,
    },
    highlight: {
      available: services.length > 0,
      services,
    },
  };
}

async function computeNewSeasonsAvailable(
  userId: string,
  tmdbId: number,
  series: TmdbSeries,
  services: WatchlistHighlightService[],
): Promise<boolean> {
  const watchedSeasons = await prisma.watchedItem.findMany({
    where: { userId, tmdbId, mediaType: "series" },
  });
  const watchedSeasonNumbers = watchedSeasons
    .map((w) => w.seasonNumber)
    .filter((n): n is number => n !== null);

  if (watchedSeasonNumbers.length === 0) return false;
  if (toSeriesStatus(series.status) !== "returning") return false;

  const maxWatchedSeason = Math.max(...watchedSeasonNumbers);
  return series.number_of_seasons > maxWatchedSeason && services.length > 0;
}

async function buildResponse(
  row: WatchlistRow,
  userId: string,
  raw: TmdbMovie | TmdbSeries,
  subscribedSet: Set<string>,
  watchedMovieSet: Set<number>,
): Promise<WatchlistItemResponse> {
  const mediaType = row.mediaType as MediaType;
  const { tmdb, highlight } = buildTmdbInfoAndHighlight(
    mediaType,
    raw,
    subscribedSet,
  );

  const base: WatchlistItemResponse = {
    id: row.id,
    tmdbId: row.tmdbId,
    mediaType,
    addedAt: row.createdAt,
    tmdb,
    highlight,
  };

  if (mediaType === "movie") {
    return { ...base, watched: watchedMovieSet.has(row.tmdbId) };
  }

  const newSeasonsAvailable = await computeNewSeasonsAvailable(
    userId,
    row.tmdbId,
    raw as TmdbSeries,
    highlight.services,
  );

  return { ...base, newSeasonsAvailable };
}

async function enrichRow(
  row: WatchlistRow,
  userId: string,
  subscribedSet: Set<string>,
  watchedMovieSet: Set<number>,
  language: string,
): Promise<WatchlistItemResponse> {
  const raw = await fetchRawTmdb(
    row.tmdbId,
    row.mediaType as MediaType,
    language,
  );
  return buildResponse(row, userId, raw, subscribedSet, watchedMovieSet);
}

export async function getWatchlist(
  userId: string,
  query: WatchlistQuery,
): Promise<PaginatedResponse<WatchlistItemResponse>> {
  const language = LOCALE_TO_TMDB_LANG[query.locale];

  const where = {
    userId,
    ...(query.type !== "all" ? { mediaType: query.type } : {}),
  };

  const orderBy =
    query.sort === "year"
      ? { year: { sort: "desc" as const, nulls: "last" as const } }
      : { createdAt: "desc" as const };

  const [rows, totalResults, userServices] = await Promise.all([
    prisma.watchlistItem.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.watchlistItem.count({ where }),
    prisma.userStreamingService.findMany({ where: { userId } }),
  ]);

  const subscribedSet = new Set(
    userServices.map((s) => `${s.countryCode}:${s.providerId}`),
  );

  // Batched, not per-row: one extra query covering every movie on this
  // page, instead of a WatchedItem lookup per item.
  const movieTmdbIds = rows
    .filter((r) => r.mediaType === "movie")
    .map((r) => r.tmdbId);
  const watchedMovies = movieTmdbIds.length
    ? await prisma.watchedItem.findMany({
        where: {
          userId,
          mediaType: "movie",
          seasonNumber: null,
          tmdbId: { in: movieTmdbIds },
        },
        select: { tmdbId: true },
      })
    : [];
  const watchedMovieSet = new Set(watchedMovies.map((w) => w.tmdbId));

  const results = await Promise.all(
    rows.map((row) =>
      enrichRow(row, userId, subscribedSet, watchedMovieSet, language),
    ),
  );

  return {
    results,
    totalResults,
    totalPages: Math.ceil(totalResults / PAGE_SIZE),
    page: query.page,
  };
}

/**
 * Upsert, not create: re-adding an item already on the watchlist is a
 * no-op (200), per the acceptance criteria — `year` stays as originally
 * cached from the first add rather than being overwritten.
 */
export async function addToWatchlist(
  userId: string,
  input: AddWatchlistInput,
  locale: SupportedLocale,
): Promise<WatchlistItemResponse> {
  const raw = await fetchRawTmdb(
    input.tmdbId,
    input.mediaType,
    LOCALE_TO_TMDB_LANG[locale],
  );
  const year = extractYear(input.mediaType, raw);

  const row = await prisma.watchlistItem.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId,
        tmdbId: input.tmdbId,
        mediaType: input.mediaType,
      },
    },
    create: {
      userId,
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
      year,
    },
    update: {},
  });

  const [userServices, watchedMovie] = await Promise.all([
    prisma.userStreamingService.findMany({ where: { userId } }),
    input.mediaType === "movie"
      ? prisma.watchedItem.findFirst({
          where: {
            userId,
            mediaType: "movie",
            seasonNumber: null,
            tmdbId: input.tmdbId,
          },
          select: { tmdbId: true },
        })
      : Promise.resolve(null),
  ]);
  const subscribedSet = new Set(
    userServices.map((s) => `${s.countryCode}:${s.providerId}`),
  );
  const watchedMovieSet = new Set(watchedMovie ? [watchedMovie.tmdbId] : []);

  return buildResponse(row, userId, raw, subscribedSet, watchedMovieSet);
}

export async function removeFromWatchlist(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<void> {
  const { count } = await prisma.watchlistItem.deleteMany({
    where: { userId, tmdbId, mediaType },
  });
  if (count === 0) {
    throw new AppError("Watchlist item not found", 404);
  }
}
