// apps/api/src/types/tmdb.types.ts

/**
 * Typed interfaces for the TMDB responses used by the client (#34)
 * which will be reused by the detail endpoints (#38 movies, #39 tv, #41 people, ...).
 * They are deliberately partial: only the fields the app consumes today.
 * Expand them in each endpoint ticket if you need more TMDB fields.
 */

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TmdbSpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: "YouTube" | string;
  type: "Trailer" | "Teaser" | "Clip" | "Featurette" | string;
  official: boolean;
}

export interface TmdbVideosResponse {
  results: TmdbVideo[];
}

export interface TmdbWatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface TmdbWatchProvidersCountry {
  link: string;
  flatrate?: TmdbWatchProviderEntry[];
  rent?: TmdbWatchProviderEntry[];
  buy?: TmdbWatchProviderEntry[];
  free?: TmdbWatchProviderEntry[];
}

/** Response from watch/providers, appendix to /movie/:id and /tv/:id, and from /watch/providers/{movie|tv}. */
export interface TmdbWatchProvidersResponse {
  id?: number;
  results: Record<string, TmdbWatchProvidersCountry>;
}

export interface TmdbBaseMedia {
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: TmdbGenre[];
  credits?: TmdbCredits;
  videos?: TmdbVideosResponse;
  recommendations?: TmdbPaginatedResponse<TmdbSearchResultItem>;
  "watch/providers"?: TmdbWatchProvidersResponse;
}

export interface TmdbMovie extends TmdbBaseMedia {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  runtime: number | null;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  poster_path: string | null;
  episodes: TmdbEpisode[];
}
export interface TmdbSeries extends TmdbBaseMedia {
  id: number;
  name: string;
  original_name: string;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  status: "Returning Series" | "Ended" | "Canceled" | string;
  seasons: TmdbSeason[];
}

export interface TmdbPersonMovieCredit {
  id: number;
  title: string;
  character?: string;
  job?: string;
  poster_path: string | null;
  release_date: string;
}

export interface TmdbPersonSeriesCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  poster_path: string | null;
  first_air_date: string;
}

export interface TmdbPersonCredits {
  cast: TmdbPersonMovieCredit[];
  crew: TmdbPersonMovieCredit[];
}

export interface TmdbPersonSeriesCredits {
  cast: TmdbPersonSeriesCredit[];
  crew: TmdbPersonSeriesCredit[];
}

export interface TmdbImage {
  file_path: string;
}

export interface TmdbPerson {
  id: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  movie_credits?: TmdbPersonCredits;
  tv_credits?: TmdbPersonSeriesCredits;
  images?: { profiles: TmdbImage[] };
}

/** Generic item for /search/multi, /discover/movie, /discover/tv, recommendations, etc. */
export interface TmdbSearchResultItem {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbCountry {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[];
}
