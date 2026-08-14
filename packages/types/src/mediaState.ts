import type { MediaType } from "./media";

/**
 * How far through a series the user is.
 *
 * The distinction between upToDate and complete is the whole point of this
 * type: having watched every season of a series that has ended is a finish,
 * while having watched every season of one still in production is a wait.
 * Collapsing both into "watched" throws away the part the user cares about.
 */
export type WatchedSeriesState = "partial" | "upToDate" | "complete";

export interface MediaStateWatchlistItem {
  tmdbId: number;
  mediaType: MediaType;
}

export interface MediaStateSeries {
  tmdbId: number;
  watchedSeasons: number;
  // null when TMDB could not be reached for this series. The state then falls
  // back to "partial": failing that way under-claims rather than telling the
  // user they have finished something they haven't.
  totalSeasons: number | null;
  state: WatchedSeriesState;
}

/**
 * Identifiers only. This exists so a card can answer "is this on my list /
 * have I seen it" without every view loading the full watchlist and history
 * — which is what deriving those answers client-side costs today, since both
 * queries page through complete objects with their TMDB data attached.
 *
 * It also keeps the answer in one cache entry rather than duplicated across
 * the discover, search and recommendation caches, so toggling a bookmark
 * invalidates one key instead of three.
 */
export interface MediaStateResponse {
  watchlist: MediaStateWatchlistItem[];
  watchedMovies: number[];
  watchedSeries: MediaStateSeries[];
}
