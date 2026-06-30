// packages/types/src/media.ts
export type MediaType = "movie" | "tv";

export type ProviderType = "flatrate" | "rent" | "buy" | "free" | "ads";

export interface Provider {
  providerId: number;
  name: string;
  logoPath: string;
  type: ProviderType;
  subscribed?: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Country {
  code: string;
  name: string;
}

export interface NormalizedSearchResult {
  id: number;
  mediaType: MediaType | "person";
  title: string;
  posterPath: string | null;
  year: number | null;
  tmdbRating: number | null;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalResults: number;
  totalPages: number;
  page: number;
}
