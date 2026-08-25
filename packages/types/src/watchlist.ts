// packages/types/src/watchlist.ts
import type { MediaType } from "./media";

export type WatchlistTypeFilter = "all" | "movie" | "series";

/**
 * `title` was removed in #234. It could never be paginated: the displayed
 * titles are localised (#189) while the stored one was English by
 * construction, so ordering by it ordered by something the user cannot see —
 * and ordering by the localised one requires holding the whole list, which is
 * the cost pagination exists to avoid.
 *
 * `year` survives because it is language-independent, already stored, and
 * already had a working `orderBy` that nothing reached.
 */
export type WatchlistSort = "added" | "year";

export interface WatchlistItemTmdbInfo {
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
}

export interface WatchlistHighlightService {
  name: string;
  logoPath: string;
}

export interface WatchlistItemHighlight {
  available: boolean;
  services: WatchlistHighlightService[];
}

export interface WatchlistItemResponse {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  addedAt: Date;
  tmdb: WatchlistItemTmdbInfo;
  highlight: WatchlistItemHighlight;
  newSeasonsAvailable?: boolean; // series only
  watched?: boolean; // movie only
}
