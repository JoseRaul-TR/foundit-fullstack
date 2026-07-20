// packages/types/src/rating.ts
import type { MediaType } from "./media";

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
