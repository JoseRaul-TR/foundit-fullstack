// packages/types/src/movies.ts
import type {
  Genre,
  MediaTrailer,
  NormalizedCastMember,
  NormalizedCrewMember,
  NormalizedSearchResult,
  ProvidersByType,
} from "./media";

export interface MovieDetailUser {
  inWatchlist: boolean;
  watched: boolean;
  rating: number | null;
}

export interface MovieDetailResponse {
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  genres: Genre[];
  runtime: number | null;
  tmdbRating: number | null;
  voteCount: number | null;
  trailer: MediaTrailer | null;
  cast: NormalizedCastMember[];
  crew: NormalizedCrewMember[];
  providers: Record<string, ProvidersByType>;
  recommendations: NormalizedSearchResult[];
  user: MovieDetailUser | null;
  ageRating: string | null;
}
