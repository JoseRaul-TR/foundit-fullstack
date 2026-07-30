// packages/types/src/media.ts
export type MediaType = "movie" | "series";

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
  genreIds: number[];
  popularity: number | null;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalResults: number;
  totalPages: number;
  page: number;
}

export interface ProvidersByType {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  free: Provider[];
  /**
   * TMDB's per-country redirect to its own /watch page for this title
   * (JustWatch-powered). Not a per-provider deep link — TMDB's licensing
   * with JustWatch doesn't allow exposing those via the free API.
   * `null` when TMDB has no link for this country/title.
   */
  link: string | null;
}

export interface MediaTrailer {
  youtubeKey: string;
}

export interface NormalizedCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface NormalizedCrewMember {
  id: number;
  name: string;
  job: string;
  profilePath: string | null;
}
