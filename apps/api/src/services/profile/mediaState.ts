// apps/api/src/services/profile/mediaState.ts
/**
 * The user's own media state, as identifiers: what is on their watchlist and
 * how far through each watched title they are. No TMDB payloads, no posters,
 * no titles — the caller already has those for whatever it is rendering.
 *
 * Movies are a plain set membership. Series are not: WatchedItem stores one
 * row per season, so "have I seen this" needs the season count AND the
 * series' status, and both of those only come from TMDB.
 *
 * That cost is bounded by the user's own history rather than by the catalog
 * — someone who has watched forty series pays forty calls, not one per card
 * they look at — and a series' status is not user-specific, so it caches
 * across every user of the app. Only the two derived fields are cached, not
 * the response body: lib/cache.ts's Map only drops an entry when it is
 * overwritten, so storing full TMDB payloads for thousands of series would
 * be the first use of that cache at a scale it was not built for.
 */

import type {
  MediaStateResponse,
  MediaStateSeries,
  MediaType,
  WatchedSeriesState,
} from "@foundit/types";
import prisma from "@/lib/prisma";
import { fetchTmdb } from "@/lib/tmdb";
import { getOrSetCache, ONE_DAY_MS } from "@/lib/cache";
import { toSeriesStatus } from "@/services/catalog/series";
import type { TmdbSeries } from "@/types/tmdb.types";

// A cold cache and a large history would otherwise fire one request per
// watched series at once.
const SERIES_CONCURRENCY = 10;

interface SeriesFacts {
  totalSeasons: number;
  finished: boolean;
}

/**
 * One day rather than a week: this is the field that decides whether a series
 * reads as "up to date" or "finished", and a week of lag in reflecting that
 * something has ended is a long time to be telling the user the wrong thing.
 */
async function loadSeriesFacts(tmdbId: number): Promise<SeriesFacts | null> {
  try {
    return await getOrSetCache(
      `series-facts:${tmdbId}`,
      ONE_DAY_MS,
      async () => {
        const series = await fetchTmdb<TmdbSeries>(`/tv/${tmdbId}`, {});
        const status = toSeriesStatus(series.status);
        return {
          totalSeasons: series.number_of_seasons,
          finished: status === "ended" || status === "canceled",
        };
      },
    );
  } catch {
    // One unreachable series must not cost the user their whole media state.
    return null;
  }
}

/**
 * Results are written by index, not pushed. Pushing from concurrent workers
 * orders by completion time instead of by source — the same mistake that put
 * every partially watched series at the end of the discover list and looked
 * exactly like the watched filter hiding them.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await fn(items[index]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export async function getMediaState(
  userId: string,
): Promise<MediaStateResponse> {
  const [watchlistRows, watchedRows] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId },
      select: { tmdbId: true, mediaType: true },
    }),
    prisma.watchedItem.findMany({
      where: { userId },
      select: { tmdbId: true, mediaType: true, seasonNumber: true },
    }),
  ]);

  const watchedMovies: number[] = [];
  const seasonsBySeries = new Map<number, Set<number>>();

  for (const row of watchedRows) {
    if (row.mediaType === "movie") {
      if (row.seasonNumber === null) watchedMovies.push(row.tmdbId);
      continue;
    }
    // Season 0 is TMDB's specials bucket and number_of_seasons doesn't count
    // it, so including it here inflates the total and marks a series as
    // finished while a real season is still unwatched — the same fix as in
    // the discover watched filter.
    if (row.seasonNumber === null || row.seasonNumber === 0) continue;
    const seasons = seasonsBySeries.get(row.tmdbId) ?? new Set<number>();
    seasons.add(row.seasonNumber);
    seasonsBySeries.set(row.tmdbId, seasons);
  }

  const seriesIds = [...seasonsBySeries.keys()];
  const facts = await mapWithConcurrency(
    seriesIds,
    SERIES_CONCURRENCY,
    loadSeriesFacts,
  );

  const watchedSeries: MediaStateSeries[] = seriesIds.map((tmdbId, index) => {
    const watchedSeasons = seasonsBySeries.get(tmdbId)?.size ?? 0;
    const fact = facts[index];

    if (!fact) {
      return { tmdbId, watchedSeasons, totalSeasons: null, state: "partial" };
    }

    // number_of_seasons counts the seasons TMDB knows about, which can
    // include one announced but not yet aired. A series can therefore read
    // as "partial" for a season nobody could have watched. The same
    // imprecision already governs newSeasonsAvailable; inherited on purpose.
    const state: WatchedSeriesState =
      watchedSeasons < fact.totalSeasons
        ? "partial"
        : fact.finished
          ? "complete"
          : "upToDate";

    return { tmdbId, watchedSeasons, totalSeasons: fact.totalSeasons, state };
  });

  return {
    watchlist: watchlistRows.map((row) => ({
      tmdbId: row.tmdbId,
      mediaType: row.mediaType as MediaType,
    })),
    watchedMovies,
    watchedSeries,
  };
}
