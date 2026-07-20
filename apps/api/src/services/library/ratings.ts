// apps/api/src/services/library/ratings.ts
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

import {
  LOCALE_TO_TMDB_LANG,
  type MediaType,
  type PaginatedResponse,
  type RatingItemResponse,
} from "@foundit/types";
import { fetchBasicMediaInfo } from "@/helpers/tmdbMedia";
import { PAGE_SIZE } from "@/config/constants";
import prisma from "@/lib/prisma";
import { AppError } from "@/middleware/errorHandler";

const LANGUAGE = LOCALE_TO_TMDB_LANG.en; // no ?lang= support in this ticket, consistent with #48-#50

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

async function enrichRating(row: RatingRow): Promise<RatingItemResponse> {
  const mediaType = row.mediaType as MediaType;
  const tmdb = await fetchBasicMediaInfo(row.tmdbId, mediaType, LANGUAGE);

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
  const { count } = await prisma.userRating.deleteMany({
    where: { userId, tmdbId, mediaType },
  });
  if (count === 0) {
    throw new AppError("Rating not found", 404);
  }
}
