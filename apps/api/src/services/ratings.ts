// apps/api/src/services/ratings.ts  (ticket #51)

import { parseYear } from "@/helpers/tmdbMedia";
import prisma from "@/lib/prisma";
import { fetchTmdb } from "@/lib/tmdb";
import type { TmdbMovie, TmdbSeries } from "@/types/tmdb.types";
import type { MediaType, PaginatedResponse } from "@foundit/types";

/**
 * UserRating's compound unique key (userId, tmdbId, mediaType) has no
 * nullable columns, so — unlike #49's WatchedItem/seasonNumber case — the
 * upsert-on-compound-key shortcut is safe to use directly here.
 *
 * GET is paginated (20/page, same PAGE_SIZE as #48-#50), ordered by
 * updatedAt desc (most recently rated first).
 *
 * ratedAt maps to updatedAt (not createdAt): re-rating updates rating
 * without changing when the row was first created, and @updatedAt bumps
 * updatedAt automatically on any update — so updatedAt is the field that
 * actually reflects "when the user last rated this."
 */

const PAGE_SIZE = 20;
const LANGUAGE = "en-US"; // no ?lang= support in this ticket, consistent with #48-#50

export interface RatingTmdbInfo {
  title: string;
  posterPath: string | null;
  year: number | null;
}

export interface RatingItemResponse {
  tmdbId: number;
  mediaType: MediaType;
  rating: number;
  ratedAt: Date;
  tmdb: RatingTmdbInfo;
}

export interface UpsertRatingInput {
  tmdbId: number;
  mediaType: MediaType;
  rating: number;
}

interface RatingRow {
  tmdbId: number;
  mediaType: string;
  rating: number;
  updatedAt: Date;
}

async function fetchTmdbInfo(
  tmdbId: number,
  mediaType: MediaType,
): Promise<RatingTmdbInfo> {
  if (mediaType === "movie") {
    const raw = await fetchTmdb<TmdbMovie>(`/movie/${tmdbId}`, {
      language: LANGUAGE,
    });
    return {
      title: raw.title,
      posterPath: raw.poster_path,
      year: parseYear(raw.release_date),
    };
  }
  const raw = await fetchTmdb<TmdbSeries>(`/tv/${tmdbId}`, {
    language: LANGUAGE,
  });
  return {
    title: raw.name,
    posterPath: raw.poster_path,
    year: parseYear(raw.first_air_date),
  };
}

async function enrichRating(row: RatingRow): Promise<RatingItemResponse> {
  const mediaType = row.mediaType as MediaType;
  const tmdb = await fetchTmdbInfo(row.tmdbId, mediaType);

  return {
    tmdbId: row.tmdbId,
    mediaType,
    rating: row.rating,
    ratedAt: row.updatedAt,
    tmdb,
  };
}

export async function listRatings(
  userId: string,
  page: number,
): Promise<PaginatedResponse<RatingItemResponse>> {
  const where = { userId };

  const [rows, totalResults] = await Promise.all([
    prisma.userRating.findMany({
      where,
      orderBy: { updatedAt: "desc" as const },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.userRating.count({ where }),
  ]);

  const results = await Promise.all(rows.map((row) => enrichRating(row)));

  return {
    results,
    totalResults,
    totalPages: Math.ceil(totalResults / PAGE_SIZE),
    page,
  };
}

/**
 * Returns the single created/updated rating, not the full list — same
 * precedent as #48's addToWatchlist and #49/#50's mark-watched endpoints.
 */
export async function upsertRating(
  userId: string,
  input: UpsertRatingInput,
): Promise<RatingItemResponse> {
  const row = await prisma.userRating.upsert({
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
      rating: input.rating,
    },
    update: { rating: input.rating },
  });

  return enrichRating(row);
}

export async function removeRating(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<void> {
  await prisma.userRating.deleteMany({ where: { userId, tmdbId, mediaType } });
}
