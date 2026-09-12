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
  TmdbSeason,
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

const SPECIALS: TmdbSeason = {
  id: 0,
  season_number: 0,
  name: "Specials",
  episode_count: 3,
  air_date: "2008-02-17",
  poster_path: null,
};

/**
 * A seasons array as TMDB returns one: the specials bucket at 0, then the
 * real seasons from 1 up.
 *
 * `aired` seasons carry dates in the past, `announced` ones carry dates far
 * enough in the future to stay future for the life of this project, and
 * `undated` ones carry null — TMDB's third state, which is neither of the
 * other two and is the one a naive date comparison gets wrong (#300).
 *
 * Dates are fixed rather than derived from the clock: a fixture whose meaning
 * depends on when the suite runs is not a fixture.
 */
export function seasonsFixture(
  aired: number,
  { announced = 0, undated = 0 }: { announced?: number; undated?: number } = {},
): TmdbSeason[] {
  const seasons: TmdbSeason[] = [SPECIALS];
  let seasonNumber = 0;

  for (let i = 0; i < aired; i += 1) {
    seasonNumber += 1;
    seasons.push({
      id: seasonNumber,
      season_number: seasonNumber,
      name: `Season ${seasonNumber}`,
      episode_count: 10,
      air_date: `${2000 + seasonNumber}-01-01`,
      poster_path: null,
    });
  }

  for (let i = 0; i < announced; i += 1) {
    seasonNumber += 1;
    seasons.push({
      id: seasonNumber,
      season_number: seasonNumber,
      name: `Season ${seasonNumber}`,
      episode_count: 0,
      air_date: `${2090 + i}-01-01`,
      poster_path: null,
    });
  }

  for (let i = 0; i < undated; i += 1) {
    seasonNumber += 1;
    seasons.push({
      id: seasonNumber,
      season_number: seasonNumber,
      name: `Season ${seasonNumber}`,
      episode_count: 0,
      air_date: null,
      poster_path: null,
    });
  }

  return seasons;
}

export function seriesFixture(overrides: Partial<TmdbSeries> = {}): TmdbSeries {
  // Read before the spread so an override of number_of_seasons is reflected in
  // the seasons array too. Tests that set one and not the other used to be
  // internally consistent by accident; since #300 the two are read together.
  const numberOfSeasons = overrides.number_of_seasons ?? 5;

  return {
    id: 1396,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    overview: "A show about a chemistry teacher.",
    poster_path: "/poster.jpg",
    backdrop_path: null,
    first_air_date: "2008-01-20",
    number_of_seasons: numberOfSeasons,
    number_of_episodes: 62,
    status: "Ended",
    seasons: seasonsFixture(numberOfSeasons),
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
