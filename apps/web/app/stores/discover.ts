// apps/web/app/stores/discover.ts
import { defineStore } from "pinia";
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
  selectedProviderIds: number[] | null;
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

function emptyFilters(): DiscoverFiltersState {
  return {
    genres: [],
    yearFrom: null,
    yearTo: null,
    minRating: null,
    sort: "popularity",
    movieAgeRatingMax: null,
    seriesAgeRatingMax: null,
    selectedProviderIds: null,
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
      state.filters.selectedProviderIds !== null,
  },
  actions: {
    resetSection(section: "movies" | "series") {
      this[section] = emptySection();
    },
    resetFilters() {
      this.filters = emptyFilters();
    },
  },
});
