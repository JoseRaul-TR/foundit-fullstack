// packages/types/src/catalog.ts
export interface GenreItem {
  id: number;
  name: string;
}

// NB: field is literally "tv", not "series" — pre-existing inconsistency
// with the rest of the app's own naming convention, preserved as-is
// rather than silently changed (it's a real JSON response key already
// shipped, not just an internal name).
export interface GenresResponse {
  movie: GenreItem[];
  tv: GenreItem[];
}

export interface ProviderItem {
  providerId: number;
  name: string;
  logoPath: string | null;
}

export interface CountryItem {
  code: string;
  name: string;
  nativeName: string;
}

// TMDB's own ordering within a country (e.g. US: G < PG < PG-13 < R
// NC-17) — `order` is what makes a "show me X or below" ceiling filter
// possible for series, where TMDB's discover has no native certification
// param (unlike /discover/movie's certification.lte).
export interface CertificationItem {
  certification: string;
  order: number;
}
