// apps/web/app/stores/discover.ts
import { defineStore } from "pinia";
import { toRaw } from "vue";
import type { NormalizedSearchResult } from "@foundit/types";

export type DiscoverSort = "popularity" | "release_date";
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
  // Which language these results are in. Staleness becomes a property of the
  // data instead of something a watcher has to notice in time — which it
  // couldn't, because DiscoverPanel is remounted on a locale change and the
  // dying instance and the new one both tried (#208).
  loadedLocale: string | null;
}

function emptySection(): SectionState {
  return {
    results: [],
    page: 1,
    totalPages: 1,
    loading: false,
    error: null,
    loadedLocale: null,
  };
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
    filtersOpen: false,
    movies: emptySection(),
    series: emptySection(),
  }),
  getters: {
    moviesHasMore: (state) => state.movies.page < state.movies.totalPages,
    seriesHasMore: (state) => state.series.page < state.series.totalPages,
    // The badge counts what narrows, and the two kinds of control here narrow
    // in opposite directions.
    //
    // Genres are additive: the default is none, and every pill the user turns
    // on is an independent narrowing they asked for. Counting them one by one
    // is what this ticket was reported for — a tester with two genres selected
    // saw "1" and had no way to tell whether the second had been applied,
    // ignored or dropped (#315).
    //
    // Countries and platforms are subtractive: the default is everything the
    // profile carries, every pill starts lit, and the only available action is
    // to remove. Counting what remains would make the number fall as the user
    // restricts further — three countries down to one would read 2, then 1 —
    // so each of those groups contributes one, meaning "you have narrowed by
    // country" rather than "two countries are active". The number of removals
    // would be the truer figure, and computing it needs the available set,
    // which lives in the profile store rather than here. #332.
    //
    // null and [] both contribute nothing, and both mean the same thing
    // downstream: buildRegionsParam answers either with no region filter at
    // all. A full explicit array cannot occur — the toggles normalise it to
    // null.
    //
    // `excludeWatched` still counts when it is switched OFF, which is
    // backwards — that is the state in which it filters nothing. Left alone
    // here on purpose: deciding it means deciding whether the filter should be
    // on by default at all, and that is #332.
    activeFilterCount: (state): number => {
      const f = state.filters;
      let count = f.genres.length;
      if (f.yearFrom !== null || f.yearTo !== null) count += 1;
      if (f.minRating !== null) count += 1;
      if (f.movieAgeRatingMax !== null || f.seriesAgeRatingMax !== null)
        count += 1;
      if (f.selectedCountryCodes?.length) count += 1;
      if (f.selectedProviderIds?.length) count += 1;
      if (f.excludeWatched !== DEFAULT_EXCLUDE_WATCHED) count += 1;
      return count;
    },
    hasActiveFilters(): boolean {
      return this.activeFilterCount > 0;
    },
  },
  actions: {
    openFilters() {
      this.filtersOpen = true;
    },
    closeFilters() {
      this.filtersOpen = false;
    },
    toggleFilters() {
      this.filtersOpen = !this.filtersOpen;
    },
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
