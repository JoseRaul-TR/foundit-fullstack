// apps/web/app/composables/discover/useDiscover.ts
//
// Mirrors useSearch.ts's shape (store + fetch functions), but Discover
// has two independent paginated sections (movies/series) instead of one,
// so fetchPage/fetchNextPage take a `mediaType` argument throughout.
import type { NormalizedSearchResult, PaginatedResponse } from "@foundit/types";
import { useDiscoverStore } from "~/stores/discover";

export type DiscoverMediaType = "movies" | "series";

export function useDiscover() {
  const store = useDiscoverStore();
  const { apiFetch } = useApi();
  const { locale } = useLocale();
  const profileStore = useProfileStore();
  const route = useRoute();

  // The active tab lives in the URL so the view is shareable and the back
  // button behaves — under its own parameter, not the `type` search uses.
  //
  // `/` hosts both surfaces and both used to write `?type=`: in search mode it
  // names the result filter (multi/movie/series/person), here it named the tab.
  // One name with two meanings, and searching from the series tab destroyed the
  // tab on the way out (#206).
  //
  // Singular in the URL to match the vocabulary search uses for its own filter;
  // plural internally because that's what the store calls its sections.
  const activeMediaType = computed<DiscoverMediaType>(() =>
    route.query.tab === "series" ? "series" : "movies",
  );

  // Country first, provider as a refinement within the selected countries.
  //
  // Three ways out with no `regions` at all, and they mean the same thing to
  // the backend: no configured subscriptions, no country selected, or no
  // provider selected. TMDB's watch_region only means something alongside
  // with_watch_providers, so the two always travel together — dropping either
  // drops both, and the answer becomes global.
  //
  // undefined rather than "[]": an empty array would reach the backend as zero
  // regions, which its merge reads as zero results rather than "no filter".
  function buildRegionsParam(): string | undefined {
    const entries = Object.entries(profileStore.subscribedServices);
    if (entries.length === 0) return undefined;

    const selectedCountries = store.filters.selectedCountryCodes;
    if (selectedCountries !== null && selectedCountries.length === 0) {
      return undefined;
    }

    const selectedProviders = store.filters.selectedProviderIds;
    if (selectedProviders !== null && selectedProviders.length === 0) {
      return undefined;
    }

    const regions = entries
      .filter(
        ([countryCode]) =>
          selectedCountries === null || selectedCountries.includes(countryCode),
      )
      .map(([countryCode, services]) => ({
        countryCode,
        providerIds: selectedProviders
          ? services
              .map((s) => s.providerId)
              .filter((id) => selectedProviders.includes(id))
          : services.map((s) => s.providerId),
      }))
      .filter((region) => region.providerIds.length > 0);

    if (regions.length === 0) return undefined;

    return JSON.stringify(regions);
  }

  function buildAgeRatingParams(mediaType: DiscoverMediaType) {
    const ageRatingMax =
      mediaType === "movies"
        ? store.filters.movieAgeRatingMax
        : store.filters.seriesAgeRatingMax;
    if (!ageRatingMax || !profileStore.ageRatingCountry) return {};
    return { ageRatingMax, ageRatingCountry: profileStore.ageRatingCountry };
  }

  async function fetchPage(mediaType: DiscoverMediaType, page: number) {
    const section = store[mediaType];
    if (section.loading) return;
    section.loading = true;
    section.error = null;
    // Claimed before the await, not on success: a second caller arriving while
    // this is in flight has to be able to see that the language is already
    // being fetched.
    section.loadedLocale = locale.value;

    try {
      // No `lang` and no baseURL here: apiFetch adds the locale from the same
      // useLocale() this reads for loadedLocale, and resolves loopback vs
      // public origin itself. Two sources for one parameter is how #208
      // happened.

      const response = await apiFetch<{
        success: boolean;
        data: PaginatedResponse<NormalizedSearchResult>;
      }>(`/api/v1/discover/${mediaType}`, {
        query: {
          page,
          sort: store.filters.sort,
          genres: store.filters.genres.length
            ? store.filters.genres.join(",")
            : undefined,
          yearFrom: store.filters.yearFrom ?? undefined,
          yearTo: store.filters.yearTo ?? undefined,
          minRating: store.filters.minRating ?? undefined,
          regions: buildRegionsParam(),
          ...buildAgeRatingParams(mediaType),
          excludeWatched: store.filters.excludeWatched,
        },
      });

      section.results =
        page === 1
          ? response.data.results
          : [...section.results, ...response.data.results];
      section.page = response.data.page;
      section.totalPages = response.data.totalPages;
    } catch (error) {
      // apiFetch has already cleared the session and started the navigation to
      // login. An error banner on top of that describes nothing that happened.
      if (!isUnauthorized(error)) section.error = "errors.generic";
    } finally {
      section.loading = false;
    }
  }

  // Applying filters invalidates both sections but only fetches the active one.
  // Emptying the inactive section costs nothing and is what keeps it honest:
  // otherwise switching tabs would show results computed with the previous
  // filters while the panel claimed otherwise.
  async function applyFilters() {
    store.resetSection("movies");
    store.resetSection("series");
    await fetchPage(activeMediaType.value, 1);
  }

  // The one entry point for "make sure what's on screen is right". Stale means
  // either nothing loaded or loaded in another language, and both answers live
  // in the section rather than in whoever called.
  //
  // The `loading` half of the guard is what stops the double request: on a
  // locale change the dying DiscoverPanel gets here first and starts the fetch,
  // and the freshly mounted one arrives to find the language already claimed.
  async function ensureActiveLoaded() {
    const mediaType = activeMediaType.value;
    const section = store[mediaType];
    const fresh = section.loadedLocale === locale.value;
    if (fresh && (section.loading || section.results.length > 0)) return;
    store.resetSection(mediaType);
    await fetchPage(mediaType, 1);
  }

  async function fetchNextPage(mediaType: DiscoverMediaType) {
    const section = store[mediaType];
    const hasMore =
      mediaType === "movies" ? store.moviesHasMore : store.seriesHasMore;
    if (section.loading || !hasMore) return;
    await fetchPage(mediaType, section.page + 1);
  }

  return {
    filters: computed(() => store.filters),
    movies: computed(() => store.movies.results),
    series: computed(() => store.series.results),
    moviesLoading: computed(() => store.movies.loading),
    seriesLoading: computed(() => store.series.loading),
    moviesHasMore: computed(() => store.moviesHasMore),
    seriesHasMore: computed(() => store.seriesHasMore),
    hasActiveFilters: computed(() => store.hasActiveFilters),
    ensureActiveLoaded,
    applyFilters,
    fetchNextPage,
    resetFilters: () => {
      store.resetFilters();
      return applyFilters();
    },
    activeMediaType,
  };
}
