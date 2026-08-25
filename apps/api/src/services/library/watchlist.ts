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
 * too. It reads a map built once per page rather than querying per row:
 * that per-row query was the pool amplifier found while investigating #238.
 */
import {
  LOCALE_TO_TMDB_LANG,
  type MediaType,
  type PaginatedResponse,
  type SortDirection,
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
  order: SortDirection;
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

/**
 * One query for the whole page instead of one per series row. All
 * computeNewSeasonsAvailable ever needed from WatchedItem was the highest
 * season number, so `_max` in the database replaces `Math.max` in memory and
 * the per-row round trip disappears with it.
 *
 * An absent key means the user has watched no season of that series, which
 * is different from having watched season 0 — hence a Map lookup returning
 * undefined rather than a number defaulting to zero.
 *
 * Season 0 is TMDB's specials bucket and is counted here, as it always has
 * been: someone who has watched only specials has a max of 0, so any real
 * season counts as new. mediaState.ts deliberately excludes it from its
 * *count* for a different reason (number_of_seasons does not include it).
 * The two are consistent with their own purposes, not with each other.
 */
async function fetchMaxWatchedSeasonMap(
  userId: string,
  seriesTmdbIds: number[],
): Promise<Map<number, number>> {
  if (seriesTmdbIds.length === 0) return new Map();

  const groups = await prisma.watchedItem.groupBy({
    by: ["tmdbId"],
    where: {
      userId,
      mediaType: "series",
      tmdbId: { in: seriesTmdbIds },
      seasonNumber: { not: null },
    },
    _max: { seasonNumber: true },
  });

  const map = new Map<number, number>();
  for (const group of groups) {
    if (group._max.seasonNumber !== null) {
      map.set(group.tmdbId, group._max.seasonNumber);
    }
  }
  return map;
}

function computeNewSeasonsAvailable(
  series: TmdbSeries,
  services: WatchlistHighlightService[],
  maxWatchedSeason: number | undefined,
): boolean {
  if (maxWatchedSeason === undefined) return false;
  if (toSeriesStatus(series.status) !== "returning") return false;
  return series.number_of_seasons > maxWatchedSeason && services.length > 0;
}

function buildResponse(
  row: WatchlistRow,
  raw: TmdbMovie | TmdbSeries,
  subscribedSet: Set<string>,
  watchedMovieSet: Set<number>,
  maxWatchedSeasonMap: Map<number, number>,
): WatchlistItemResponse {
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

  return {
    ...base,
    newSeasonsAvailable: computeNewSeasonsAvailable(
      raw as TmdbSeries,
      highlight.services,
      maxWatchedSeasonMap.get(row.tmdbId),
    ),
  };
}

async function enrichRow(
  row: WatchlistRow,
  subscribedSet: Set<string>,
  watchedMovieSet: Set<number>,
  maxWatchedSeasonMap: Map<number, number>,
  language: string,
): Promise<WatchlistItemResponse> {
  const raw = await fetchRawTmdb(
    row.tmdbId,
    row.mediaType as MediaType,
    language,
  );
  return buildResponse(
    row,
    raw,
    subscribedSet,
    watchedMovieSet,
    maxWatchedSeasonMap,
  );
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

  /**
   * Every sort ends in `id` because none of the others is unique. Without a
   * total order, `ORDER BY year DESC LIMIT 20 OFFSET 20` may return
   * differently-ordered rows on each call, so an item whose year is shared
   * with another can land on two consecutive pages or on neither. Harmless
   * while the client fetched every page and flattened them; a visible bug
   * the moment the pages are requested separately, which is what #234 does.
   *
   * `nulls: "last"` stays fixed rather than following the direction: items
   * with no year belong at the bottom either way, not at the top of an
   * ascending list.
   */
  const orderBy =
    query.sort === "year"
      ? [
          { year: { sort: query.order, nulls: "last" as const } },
          { createdAt: "desc" as const },
          { id: "asc" as const },
        ]
      : [{ createdAt: query.order }, { id: "asc" as const }];

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

  // Both lookups are batched and run together: one query covering every
  // movie on this page, one covering every series. Enrichment below is then
  // pure TMDB — a page costs five database queries whatever its size, where
  // it used to cost five plus one per series.
  const movieTmdbIds = rows
    .filter((r) => r.mediaType === "movie")
    .map((r) => r.tmdbId);
  const seriesTmdbIds = rows
    .filter((r) => r.mediaType === "series")
    .map((r) => r.tmdbId);

  const [watchedMovies, maxWatchedSeasonMap] = await Promise.all([
    movieTmdbIds.length
      ? prisma.watchedItem.findMany({
          where: {
            userId,
            mediaType: "movie",
            seasonNumber: null,
            tmdbId: { in: movieTmdbIds },
          },
          select: { tmdbId: true },
        })
      : Promise.resolve([]),
    fetchMaxWatchedSeasonMap(userId, seriesTmdbIds),
  ]);
  const watchedMovieSet = new Set(watchedMovies.map((w) => w.tmdbId));

  const results = await Promise.all(
    rows.map((row) =>
      enrichRow(
        row,
        subscribedSet,
        watchedMovieSet,
        maxWatchedSeasonMap,
        language,
      ),
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

  const [userServices, watchedMovie, maxWatchedSeasonMap] = await Promise.all([
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
    input.mediaType === "series"
      ? fetchMaxWatchedSeasonMap(userId, [input.tmdbId])
      : Promise.resolve(new Map<number, number>()),
  ]);
  const subscribedSet = new Set(
    userServices.map((s) => `${s.countryCode}:${s.providerId}`),
  );
  const watchedMovieSet = new Set(watchedMovie ? [watchedMovie.tmdbId] : []);

  return buildResponse(
    row,
    raw,
    subscribedSet,
    watchedMovieSet,
    maxWatchedSeasonMap,
  );
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
