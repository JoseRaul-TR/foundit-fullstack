//apps/api/src/services/library/watchlist.ts
/**
 * title/year are cached on WatchlistItem at add-time (see migration adding
 * those two nullable columns) instead of always fetched from TMDB. This is
 * the resolution to the sort/pagination tension discussed: DB can only
 * ORDER BY + LIMIT/OFFSET correctly on columns it actually has, and
 * title/year aren't derivable from tmdbId alone without a TMDB call per
 * item. Caching them at write time means GET can paginate/sort entirely
 * at the DB level for all three sort modes, and only ever enriches exactly
 * the 20 items of the requested page with live TMDB data (poster, rating,
 * providers) — never more, regardless of sort or watchlist size.
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

const BASIC_LANGUAGE = LOCALE_TO_TMDB_LANG.en; // no ?lang= in this ticket; see note in routes/watchlist.ts

export interface WatchlistQuery {
  type: WatchlistTypeFilter;
  sort: WatchlistSort;
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
): Promise<TmdbMovie | TmdbSeries> {
  return fetchMediaRaw(tmdbId, mediaType, {
    append_to_response: "watch/providers",
    language: BASIC_LANGUAGE,
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

  if (mediaType !== "series") {
    return base;
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
): Promise<WatchlistItemResponse> {
  const raw = await fetchRawTmdb(row.tmdbId, row.mediaType as MediaType);
  return buildResponse(row, userId, raw, subscribedSet);
}

export async function getWatchlist(
  userId: string,
  query: WatchlistQuery,
): Promise<PaginatedResponse<WatchlistItemResponse>> {
  const where = {
    userId,
    ...(query.type !== "all" ? { mediaType: query.type } : {}),
  };

  const orderBy =
    query.sort === "title"
      ? { title: { sort: "asc" as const, nulls: "last" as const } }
      : query.sort === "year"
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

  const results = await Promise.all(
    rows.map((row) => enrichRow(row, userId, subscribedSet)),
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
 * no-op (200), per the acceptance criteria — title/year stay as originally
 * cached from the first add rather than being overwritten.
 */
export async function addToWatchlist(
  userId: string,
  input: AddWatchlistInput,
): Promise<WatchlistItemResponse> {
  const raw = await fetchRawTmdb(input.tmdbId, input.mediaType);
  const title = extractTitle(input.mediaType, raw);
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
      title,
      year,
    },
    update: {},
  });

  const userServices = await prisma.userStreamingService.findMany({
    where: { userId },
  });
  const subscribedSet = new Set(
    userServices.map((s) => `${s.countryCode}:${s.providerId}`),
  );

  return buildResponse(row, userId, raw, subscribedSet);
}

export async function removeFromWatchlist(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<void> {
  await prisma.watchlistItem.deleteMany({
    where: { userId, tmdbId, mediaType },
  });
}
