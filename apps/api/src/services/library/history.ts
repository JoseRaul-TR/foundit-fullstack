// apps/api/src/services/library/history.ts
/**
 * Single service file backing GET /api/history and the four mark/unmark
 * endpoints, since #50 confirmed the same GET is reused across both media
 * types.
 *
 * GET returns one mixed, paginated list. It used to return two incompatible
 * shapes chosen by a required `type` parameter, so the client fetched both
 * sequences in full and merged them in the browser — which is what made the
 * page impossible to paginate (#234). `type` is now a filter defaulting to
 * "all", and paging happens where it has to: over distinct
 * (tmdbId, mediaType) pairs in the database rather than over rows. A movie
 * has one row and a show has one per season, so paging rows would count a
 * five-season show as five entries.
 *
 * groupBy is what makes that possible: one group per watched thing, with
 * _max(createdAt) serving as both lastWatchedAt and the sort key.
 *
 * Everything the page needs beyond TMDB is fetched in two batched queries
 * covering the whole page — the season numbers of its series, and its
 * ratings — rather than one query per row. The TMDB enrichment stays one
 * call per item; that one is unavoidable here, and #234's second half cuts
 * it by asking for twenty items instead of all of them.
 */

import {
  LOCALE_TO_TMDB_LANG,
  type HistoryItemResponse,
  type HistoryMovieItemResponse,
  type HistorySeriesItemResponse,
  type HistoryTypeFilter,
  type MediaType,
  type PaginatedResponse,
  type SortDirection,
  type SupportedLocale,
} from "@foundit/types";
import {
  extractTitle,
  extractYear,
  fetchBasicMediaInfo,
  fetchMediaRaw,
} from "@/helpers/tmdbMedia";
import { PAGE_SIZE } from "@/config/constants";
import prisma from "@/lib/prisma";
import type { TmdbSeries } from "@/types/tmdb.types";

export interface HistoryQuery {
  locale: SupportedLocale;
  type: HistoryTypeFilter;
  /** Applies to the only sort this list has: when it was last watched. */
  order: SortDirection;
  page: number;
}

export interface MarkMovieWatchedInput {
  tmdbId: number;
}

export interface MarkSeasonWatchedInput {
  tmdbShowId: number;
  seasonNumber: number;
}

/** One watched thing, before TMDB knows anything about it. */
interface HistoryEntry {
  tmdbId: number;
  mediaType: MediaType;
  lastWatchedAt: Date;
}

// ---------------------------------------------------------------------------
// shared
// ---------------------------------------------------------------------------

/**
 * TMDB ids are namespaced per media type, so movie 550 and series 550 are
 * different things that both exist. Keying ratings by tmdbId alone was
 * correct only while a page held a single media type; on a mixed page the
 * second one would overwrite the first and a card would quietly display
 * someone else's score. Same class of silent overwrite as #196.
 */
function ratingKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

/**
 * One IN query for the page. It matches on tmdbId only, so it can return a
 * rating for movie 550 while the page holds series 550 — that extra row
 * lands under a key nobody looks up, which is precisely what the composite
 * key buys.
 */
async function fetchRatingsMap(
  userId: string,
  entries: { tmdbId: number; mediaType: MediaType }[],
): Promise<Map<string, number>> {
  if (entries.length === 0) return new Map();

  const ratings = await prisma.userRating.findMany({
    where: { userId, tmdbId: { in: entries.map((e) => e.tmdbId) } },
    select: { tmdbId: true, mediaType: true, rating: true },
  });

  return new Map(
    ratings.map((r) => [
      ratingKey(r.mediaType as MediaType, r.tmdbId),
      r.rating,
    ]),
  );
}

// ---------------------------------------------------------------------------
// movie history (#49)
// ---------------------------------------------------------------------------

async function enrichMovieEntry(
  tmdbId: number,
  lastWatchedAt: Date,
  ratingsMap: Map<string, number>,
  language: string,
): Promise<HistoryMovieItemResponse> {
  const tmdb = await fetchBasicMediaInfo(tmdbId, "movie", language);

  return {
    tmdbId,
    mediaType: "movie",
    lastWatchedAt,
    tmdb,
    rating: ratingsMap.get(ratingKey("movie", tmdbId)) ?? null,
  };
}

/**
 * Can't use upsert's compound-unique shortcut here: Postgres treats every
 * NULL in a unique constraint as distinct from every other NULL, so a
 * unique-key lookup with seasonNumber: null could never match an existing
 * row — Prisma's generated types correctly forbid null in that specific
 * position to stop you from writing a upsert that always inserts. This is
 * the same reason services/movies.ts's loadUserContext reads WatchedItem
 * via findFirst (which does support a plain `seasonNumber: null` filter,
 * translated to "IS NULL") rather than a unique-key lookup. So: findFirst,
 * then create or update by id. Re-watching bumps createdAt (== watchedAt)
 * via `update`, since @default(now()) only applies on create.
 */
export async function markMovieWatched(
  userId: string,
  input: MarkMovieWatchedInput,
  locale: SupportedLocale,
): Promise<HistoryMovieItemResponse> {
  const existing = await prisma.watchedItem.findFirst({
    where: {
      userId,
      tmdbId: input.tmdbId,
      mediaType: "movie",
      seasonNumber: null,
    },
  });

  const row = existing
    ? await prisma.watchedItem.update({
        where: { id: existing.id },
        data: { createdAt: new Date() },
      })
    : await prisma.watchedItem.create({
        data: {
          userId,
          tmdbId: input.tmdbId,
          mediaType: "movie",
          seasonNumber: null,
        },
      });

  const ratingsMap = await fetchRatingsMap(userId, [
    { tmdbId: input.tmdbId, mediaType: "movie" },
  ]);
  return enrichMovieEntry(
    row.tmdbId,
    row.createdAt,
    ratingsMap,
    LOCALE_TO_TMDB_LANG[locale],
  );
}

export async function unmarkMovieWatched(
  userId: string,
  tmdbId: number,
): Promise<void> {
  await prisma.watchedItem.deleteMany({
    where: { userId, tmdbId, mediaType: "movie", seasonNumber: null },
  });
}

// ---------------------------------------------------------------------------
// series / season history (#50)
// ---------------------------------------------------------------------------

async function enrichSeriesEntry(
  tmdbId: number,
  lastWatchedAt: Date,
  watchedSeasons: number[],
  ratingsMap: Map<string, number>,
  language: string,
): Promise<HistorySeriesItemResponse> {
  const raw = (await fetchMediaRaw(tmdbId, "series", {
    language,
  })) as TmdbSeries;

  return {
    tmdbId,
    mediaType: "series",
    tmdb: {
      title: extractTitle("series", raw),
      posterPath: raw.poster_path,
      year: extractYear("series", raw),
      numberOfSeasons: raw.number_of_seasons,
    },
    watchedSeasons: [...watchedSeasons].sort((a, b) => a - b),
    rating: ratingsMap.get(ratingKey("series", tmdbId)) ?? null,
    lastWatchedAt,
  };
}

/**
 * Same upsert-on-compound-key pattern as markMovieWatched, with
 * seasonNumber set to the actual season instead of null.
 */
export async function markSeasonWatched(
  userId: string,
  input: MarkSeasonWatchedInput,
  locale: SupportedLocale,
): Promise<HistorySeriesItemResponse> {
  await prisma.watchedItem.upsert({
    where: {
      userId_tmdbId_mediaType_seasonNumber: {
        userId,
        tmdbId: input.tmdbShowId,
        mediaType: "series",
        seasonNumber: input.seasonNumber,
      },
    },
    create: {
      userId,
      tmdbId: input.tmdbShowId,
      mediaType: "series",
      seasonNumber: input.seasonNumber,
    },
    update: { createdAt: new Date() },
  });

  const seasonRows = await prisma.watchedItem.findMany({
    where: { userId, mediaType: "series", tmdbId: input.tmdbShowId },
  });

  const watchedSeasons = seasonRows
    .map((r) => r.seasonNumber)
    .filter((n): n is number => n !== null);
  const lastWatchedAt = new Date(
    Math.max(...seasonRows.map((r) => r.createdAt.getTime())),
  );

  const ratingsMap = await fetchRatingsMap(userId, [
    { tmdbId: input.tmdbShowId, mediaType: "series" },
  ]);
  return enrichSeriesEntry(
    input.tmdbShowId,
    lastWatchedAt,
    watchedSeasons,
    ratingsMap,
    LOCALE_TO_TMDB_LANG[locale],
  );
}

export async function unmarkSeasonWatched(
  userId: string,
  tmdbShowId: number,
  seasonNumber: number,
): Promise<void> {
  await prisma.watchedItem.deleteMany({
    where: { userId, tmdbId: tmdbShowId, mediaType: "series", seasonNumber },
  });
}

// ---------------------------------------------------------------------------
// GET /api/history
// ---------------------------------------------------------------------------

async function fetchSeasonsByShow(
  userId: string,
  seriesTmdbIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (seriesTmdbIds.length === 0) return map;

  const rows = await prisma.watchedItem.findMany({
    where: { userId, mediaType: "series", tmdbId: { in: seriesTmdbIds } },
    select: { tmdbId: true, seasonNumber: true },
  });

  for (const row of rows) {
    if (row.seasonNumber === null) continue;
    const list = map.get(row.tmdbId) ?? [];
    list.push(row.seasonNumber);
    map.set(row.tmdbId, list);
  }
  return map;
}

export async function getHistory(
  userId: string,
  query: HistoryQuery,
): Promise<PaginatedResponse<HistoryItemResponse>> {
  const language = LOCALE_TO_TMDB_LANG[query.locale];

  const where = {
    userId,
    ...(query.type !== "all" ? { mediaType: query.type } : {}),
  };

  /**
   * The order ends in tmdbId because _max(createdAt) is not unique — marking
   * several things in the same second is normal, not an edge case, and
   * without a total order Postgres may return tied groups differently on
   * each call, so with LIMIT/OFFSET an entry can appear on two consecutive
   * pages or on neither. Same defect fixed on the watchlist in #234.
   *
   * The second query counts distinct (tmdbId, mediaType) pairs. Prisma has
   * no clean count-distinct over several fields, so it reads the pairs and
   * measures the array: two small columns for the whole history, which is
   * what this file already did for series alone. It would stop being cheap
   * at tens of thousands of watched items.
   */
  const [groups, distinctPairs] = await Promise.all([
    prisma.watchedItem.groupBy({
      by: ["tmdbId", "mediaType"],
      where,
      _max: { createdAt: true },
      orderBy: [{ _max: { createdAt: query.order } }, { tmdbId: "asc" }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.watchedItem.findMany({
      where,
      distinct: ["tmdbId", "mediaType"],
      select: { tmdbId: true, mediaType: true },
    }),
  ]);

  const entries: HistoryEntry[] = groups.map((g) => ({
    tmdbId: g.tmdbId,
    mediaType: g.mediaType as MediaType,
    // createdAt is NOT NULL on WatchedItem and groupBy only returns
    // non-empty groups, so _max.createdAt is guaranteed present here.
    lastWatchedAt: g._max.createdAt!,
  }));

  const [seasonsByShow, ratingsMap] = await Promise.all([
    fetchSeasonsByShow(
      userId,
      entries.filter((e) => e.mediaType === "series").map((e) => e.tmdbId),
    ),
    fetchRatingsMap(userId, entries),
  ]);

  const results = await Promise.all(
    entries.map((entry) =>
      entry.mediaType === "movie"
        ? enrichMovieEntry(
            entry.tmdbId,
            entry.lastWatchedAt,
            ratingsMap,
            language,
          )
        : enrichSeriesEntry(
            entry.tmdbId,
            entry.lastWatchedAt,
            seasonsByShow.get(entry.tmdbId) ?? [],
            ratingsMap,
            language,
          ),
    ),
  );

  const totalResults = distinctPairs.length;

  return {
    results,
    totalResults,
    totalPages: Math.ceil(totalResults / PAGE_SIZE),
    page: query.page,
  };
}
