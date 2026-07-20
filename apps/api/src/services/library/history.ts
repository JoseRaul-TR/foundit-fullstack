// apps/api/src/services/library/history.ts
/**
 * Single service file backing GET /api/history (shared, discriminated by
 * `type: "movie" | "series"`), since #50 confirmed the same GET is reused
 * across both. POST/DELETE stay fully separate per-type functions, matching
 * the fully separate routes each ticket defines.
 *
 * Movie history is a flat, unpaginated-by-TMDB-call list: each row already
 * carries createdAt (== watchedAt) and tmdbId, so GET paginates directly at
 * the DB level and only enriches the current page's rows with TMDB data.
 *
 * Series/season history groups WatchedItem rows by tmdbId (one entry per
 * show, with a watchedSeasons array). Pagination has to operate on the
 * *distinct show* count, not the row count, so it uses groupBy (by tmdbId,
 * with _max(createdAt) doubling as lastWatchedAt) instead of a plain
 * findMany+skip/take — same class of problem #48 solved for title/year
 * sorting: correctness has to live at the DB level, not be faked in memory
 * after the fact.
 *
 * UserRating is looked up with a single batched findMany per page (all
 * tmdbIds in one IN query) rather than one query per item, since the rating
 * join has no reason to cost an extra round trip per row the way the TMDB
 * enrichment unavoidably does.
 */

import {
  LOCALE_TO_TMDB_LANG,
  type HistoryMovieItemResponse,
  type HistorySeriesItemResponse,
  type HistoryType,
  type PaginatedResponse,
} from "@foundit/types";
import {
  extractTitle,
  fetchBasicMediaInfo,
  fetchMediaRaw,
} from "@/helpers/tmdbMedia";
import { PAGE_SIZE } from "@/config/constants";
import prisma from "@/lib/prisma";
import type { TmdbSeries } from "@/types/tmdb.types";

const LANGUAGE = LOCALE_TO_TMDB_LANG.en; // no ?lang= support in either ticket

export interface HistoryQuery {
  type: HistoryType;
  page: number;
}

export interface MarkMovieWatchedInput {
  tmdbId: number;
}

export interface MarkSeasonWatchedInput {
  tmdbShowId: number;
  seasonNumber: number;
}

// ---------------------------------------------------------------------------
// shared
// ---------------------------------------------------------------------------

async function fetchRatingsMap(
  userId: string,
  mediaType: HistoryType,
  tmdbIds: number[],
): Promise<Map<number, number>> {
  if (tmdbIds.length === 0) return new Map();
  const ratings = await prisma.userRating.findMany({
    where: { userId, mediaType, tmdbId: { in: tmdbIds } },
  });
  return new Map(ratings.map((r) => [r.tmdbId, r.rating]));
}

// ---------------------------------------------------------------------------
// movie history (#49)
// ---------------------------------------------------------------------------

async function enrichMovieRow(
  row: { tmdbId: number; createdAt: Date },
  ratingsMap: Map<number, number>,
): Promise<HistoryMovieItemResponse> {
  const tmdb = await fetchBasicMediaInfo(row.tmdbId, "movie", LANGUAGE);

  return {
    tmdbId: row.tmdbId,
    watchedAt: row.createdAt,
    tmdb,
    rating: ratingsMap.get(row.tmdbId) ?? null,
  };
}

async function getMovieHistory(
  userId: string,
  page: number,
): Promise<PaginatedResponse<HistoryMovieItemResponse>> {
  const where = { userId, mediaType: "movie", seasonNumber: null };

  const [rows, totalResults] = await Promise.all([
    prisma.watchedItem.findMany({
      where,
      orderBy: { createdAt: "desc" as const },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.watchedItem.count({ where }),
  ]);

  const ratingsMap = await fetchRatingsMap(
    userId,
    "movie",
    rows.map((r) => r.tmdbId),
  );
  const results = await Promise.all(
    rows.map((row) => enrichMovieRow(row, ratingsMap)),
  );

  return {
    results,
    totalResults,
    totalPages: Math.ceil(totalResults / PAGE_SIZE),
    page,
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

  const ratingsMap = await fetchRatingsMap(userId, "movie", [input.tmdbId]);
  return enrichMovieRow(row, ratingsMap);
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

async function enrichSeriesGroup(
  tmdbId: number,
  lastWatchedAt: Date,
  watchedSeasons: number[],
  ratingsMap: Map<number, number>,
): Promise<HistorySeriesItemResponse> {
  const raw = (await fetchMediaRaw(tmdbId, "series", {
    language: LANGUAGE,
  })) as TmdbSeries;

  return {
    tmdbId,
    tmdb: {
      title: extractTitle("series", raw),
      posterPath: raw.poster_path,
      numberOfSeasons: raw.number_of_seasons,
    },
    watchedSeasons: [...watchedSeasons].sort((a, b) => a - b),
    rating: ratingsMap.get(tmdbId) ?? null,
    lastWatchedAt,
  };
}

async function getSeriesHistory(
  userId: string,
  page: number,
): Promise<PaginatedResponse<HistorySeriesItemResponse>> {
  const where = { userId, mediaType: "series" };

  // Pagination has to happen over distinct shows, not rows: groupBy gives us
  // the page's shows + their lastWatchedAt (_max.createdAt) in one query.
  // A second, minimal-projection query counts the total distinct shows for
  // totalResults/totalPages.
  const [grouped, allShows] = await Promise.all([
    prisma.watchedItem.groupBy({
      by: ["tmdbId"],
      where,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" as const } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.watchedItem.findMany({
      where,
      distinct: ["tmdbId"],
      select: { tmdbId: true },
    }),
  ]);

  const totalResults = allShows.length;
  const pageTmdbIds = grouped.map((g) => g.tmdbId);

  const [seasonRows, ratingsMap] = await Promise.all([
    prisma.watchedItem.findMany({
      where: { userId, mediaType: "series", tmdbId: { in: pageTmdbIds } },
    }),
    fetchRatingsMap(userId, "series", pageTmdbIds),
  ]);

  const seasonsByShow = new Map<number, number[]>();
  for (const row of seasonRows) {
    if (row.seasonNumber === null) continue;
    const list = seasonsByShow.get(row.tmdbId) ?? [];
    list.push(row.seasonNumber);
    seasonsByShow.set(row.tmdbId, list);
  }

  const results = await Promise.all(
    grouped.map((g) =>
      // createdAt is NOT NULL on WatchedItem and groupBy only returns
      // non-empty groups, so _max.createdAt is guaranteed present here.
      enrichSeriesGroup(
        g.tmdbId,
        g._max.createdAt!,
        seasonsByShow.get(g.tmdbId) ?? [],
        ratingsMap,
      ),
    ),
  );

  return {
    results,
    totalResults,
    totalPages: Math.ceil(totalResults / PAGE_SIZE),
    page,
  };
}

/**
 * Same upsert-on-compound-key pattern as markMovieWatched, with
 * seasonNumber set to the actual season instead of null.
 */
export async function markSeasonWatched(
  userId: string,
  input: MarkSeasonWatchedInput,
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

  const ratingsMap = await fetchRatingsMap(userId, "series", [
    input.tmdbShowId,
  ]);
  return enrichSeriesGroup(
    input.tmdbShowId,
    lastWatchedAt,
    watchedSeasons,
    ratingsMap,
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
// GET /api/history dispatcher
// ---------------------------------------------------------------------------

export async function getHistory(
  userId: string,
  query: HistoryQuery,
): Promise<
  | PaginatedResponse<HistoryMovieItemResponse>
  | PaginatedResponse<HistorySeriesItemResponse>
> {
  return query.type === "movie"
    ? getMovieHistory(userId, query.page)
    : getSeriesHistory(userId, query.page);
}
