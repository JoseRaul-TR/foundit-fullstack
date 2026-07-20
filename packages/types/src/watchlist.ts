// packages/types/src/watchlist.ts
import type { MediaType } from "./media";

export type WatchlistTypeFilter = "all" | "movie" | "series";
export type WatchlistSort = "added" | "title" | "year";

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
}
