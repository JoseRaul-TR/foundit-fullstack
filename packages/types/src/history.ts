// packages/types/src/history.ts
export type HistoryType = "movie" | "series";

export interface HistoryMovieTmdbInfo {
  title: string;
  posterPath: string | null;
  year: number | null;
}

export interface HistoryMovieItemResponse {
  tmdbId: number;
  watchedAt: Date;
  tmdb: HistoryMovieTmdbInfo;
  rating: number | null;
}

export interface HistorySeriesTmdbInfo {
  title: string;
  posterPath: string | null;
  numberOfSeasons: number;
}

export interface HistorySeriesItemResponse {
  tmdbId: number;
  tmdb: HistorySeriesTmdbInfo;
  watchedSeasons: number[];
  rating: number | null;
  lastWatchedAt: Date;
}
