// apps/web/app/stores/discover.ts
import { defineStore } from "pinia";
import { toRaw } from "vue";
import type { NormalizedSearchResult } from "@foundit/types";

export type DiscoverSort = "popularity" | "rating" | "release_date" | "title";

export interface DiscoverFiltersState {
  genres: number[];
  yearFrom: number | null;
  yearTo: number | null;
  minRating: number | null;
  sort: DiscoverSort;
  movieAgeRatingMax: string | null;
  seriesAgeRatingMax: string | null;
  selectedCountryCodes: string[] | null;
  selectedProviderIds: number[] | null;
  excludeWatched: boolean;
}

interface SectionState {
  results: NormalizedSearchResult[];
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

function emptySection(): SectionState {
  return { results: [], page: 1, totalPages: 1, loading: false, error: null };
}

const DEFAULT_EXCLUDE_WATCHED = true;

function emptyFilters(): DiscoverFiltersState {
  return {
    genres: [],
    yearFrom: null,
    yearTo: null,
    minRating: null,
    sort: "popularity",
    movieAgeRatingMax: null,
    seriesAgeRatingMax: null,
    selectedCountryCodes: null,
    selectedProviderIds: null,
    excludeWatched: DEFAULT_EXCLUDE_WATCHED,
  };
}

export const useDiscoverStore = defineStore("discover", {
  state: () => ({
    filters: emptyFilters(),
    movies: emptySection(),
    series: emptySection(),
  }),
  getters: {
    moviesHasMore: (state) => state.movies.page < state.movies.totalPages,
    seriesHasMore: (state) => state.series.page < state.series.totalPages,
    hasActiveFilters: (state) =>
      state.filters.genres.length > 0 ||
      state.filters.yearFrom !== null ||
      state.filters.yearTo !== null ||
      state.filters.minRating !== null ||
      state.filters.movieAgeRatingMax !== null ||
      state.filters.seriesAgeRatingMax !== null ||
      state.filters.selectedCountryCodes !== null ||
      state.filters.selectedProviderIds !== null ||
      state.filters.excludeWatched !== DEFAULT_EXCLUDE_WATCHED,
  },
  actions: {
    resetSection(section: "movies" | "series") {
      this[section] = emptySection();
    },
    resetFilters() {
      this.filters = emptyFilters();
    },
    // The only supported way to write filters from outside.
    //
    // Assigning a spread of a reactive object here -- `store.filters =
    // { ...localFilters }` -- looks harmless but isn't: spreading reads every
    // property through the proxy, and Vue hands back nested values already
    // wrapped in their own proxies. The result is plain at the top level with
    // Proxy instances in every nested array, which makes a later
    // structuredClone throw "Proxy object could not be cloned".
    //
    // Cloning the raw object keeps this state plain, and incidentally stops
    // the caller from sharing nested references with the store.
    setFilters(filters: DiscoverFiltersState) {
      this.filters = structuredClone(toRaw(filters));
    },
    // Genres and age rating belong to one media type. TMDB numbers them
    // differently -- "Action" is 28 for film while television has "Action &
    // Adventure" at 10759 -- so carrying a selection across tabs would filter
    // by identifiers that mean nothing in the other catalogue. Year, rating,
    // platforms and countries are type-agnostic and survive the switch.
    clearTypeSpecificFilters() {
      this.filters.genres = [];
      this.filters.movieAgeRatingMax = null;
      this.filters.seriesAgeRatingMax = null;
    },
  },
});
