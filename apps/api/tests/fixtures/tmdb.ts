// apps/api/tests/fixtures/tmdb.ts
//
// Reusable TMDB response fixtures for tests that mock @/lib/tmdb. Shapes
// match apps/api/src/types/tmdb.types.ts exactly, with sensible defaults
// overridable per test.
import type {
  TmdbCertificationsResponse,
  TmdbMovie,
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
  TmdbSeries,
  TmdbWatchProvidersResponse,
} from "@/types/tmdb.types";

export function movieFixture(overrides: Partial<TmdbMovie> = {}): TmdbMovie {
  return {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    overview: "A movie about a fight club.",
    poster_path: "/poster.jpg",
    backdrop_path: null,
    release_date: "1999-10-15",
    runtime: 139,
    vote_average: 8.4,
    vote_count: 1000,
    genres: [],
    "watch/providers": { results: {} },
    ...overrides,
  };
}

export function seriesFixture(overrides: Partial<TmdbSeries> = {}): TmdbSeries {
  return {
    id: 1396,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    overview: "A show about a chemistry teacher.",
    poster_path: "/poster.jpg",
    backdrop_path: null,
    first_air_date: "2008-01-20",
    number_of_seasons: 5,
    number_of_episodes: 62,
    status: "Ended",
    seasons: [],
    vote_average: 9.5,
    vote_count: 2000,
    genres: [],
    "watch/providers": { results: {} },
    ...overrides,
  };
}

/**
 * A single-country watch/providers block, e.g.
 * watchProviders("US", [{ providerId: 8, name: "Netflix", logoPath: "/n.jpg" }])
 */
export function watchProviders(
  countryCode: string,
  flatrate: { providerId: number; name: string; logoPath: string }[],
): TmdbWatchProvidersResponse {
  return {
    results: {
      [countryCode]: {
        link: `https://www.themoviedb.org/movie/550-fight-club/watch?locale=${countryCode}`,
        flatrate: flatrate.map((p) => ({
          provider_id: p.providerId,
          provider_name: p.name,
          logo_path: p.logoPath,
          display_priority: 1,
        })),
      },
    },
  };
}

/**
 * A /discover list item. Deliberately minimal: these carry far less than a
 * detail response, which is exactly why discover has to enrich some of them
 * with a second call.
 */
export function listItem(
  id: number,
  overrides: Partial<TmdbSearchResultItem> = {},
): TmdbSearchResultItem {
  return {
    id,
    title: `Title ${id}`,
    name: `Title ${id}`,
    poster_path: `/poster-${id}.jpg`,
    genre_ids: [18],
    release_date: "2020-01-01",
    first_air_date: "2020-01-01",
    vote_average: 7,
    vote_count: 500,
    popularity: 100 - id, // descending by id, so fetch order is predictable
    ...overrides,
  };
}

export function discoverPage(
  items: TmdbSearchResultItem[],
  { page = 1, totalPages = 1 } = {},
): TmdbPaginatedResponse<TmdbSearchResultItem> {
  return {
    page,
    results: items,
    total_pages: totalPages,
    total_results: items.length * totalPages,
  };
}

/** TMDB's per-country certification list, as /certification/tv/list returns it. */
export function certifications(
  countryCode: string,
  entries: { certification: string; order: number }[],
): TmdbCertificationsResponse {
  return {
    certifications: {
      [countryCode]: entries.map((e) => ({ ...e, meaning: "" })),
    },
  };
}
