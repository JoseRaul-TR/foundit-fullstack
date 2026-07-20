// packages/types/src/series.ts
import type {
  Genre,
  MediaTrailer,
  NormalizedCastMember,
  NormalizedSearchResult,
  ProvidersByType,
} from "./media";

export type SeriesStatus = "returning" | "ended" | "canceled" | "upcoming";

export interface SeriesDetailUser {
  inWatchlist: boolean;
  watched: boolean;
  rating: number | null;
}

export interface SeriesSeasonSummary {
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  // Absent (not `false`) for unauthenticated users — see services/series.ts.
  watched?: boolean;
}

export interface SeriesDetailResponse {
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  genres: Genre[];
  runtime: null; // TMDB has no single "runtime" for a series; kept for shape parity with movies
  tmdbRating: number | null;
  voteCount: number | null;
  trailer: MediaTrailer | null;
  cast: NormalizedCastMember[];
  providers: Record<string, ProvidersByType>;
  recommendations: NormalizedSearchResult[];
  user: SeriesDetailUser | null;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: SeriesStatus;
  seasons: SeriesSeasonSummary[];
  newSeasonsAvailable: boolean;
  availableOn: string[];
}

export interface SeriesEpisodeSummary {
  episodeNumber: number;
  title: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
}

export interface SeriesSeasonDetailResponse {
  seasonNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  episodeCount: number;
  posterPath: string | null;
  episodes: SeriesEpisodeSummary[];
}
