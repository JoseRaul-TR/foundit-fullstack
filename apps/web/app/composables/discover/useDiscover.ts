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
  const { public: publicConfig } = useRuntimeConfig();
  const { locale } = useLocale();
  const profileStore = useProfileStore();
  const route = useRoute();

  // The active tab lives in the URL so the view is shareable and the back
  // button behaves. Search and Discover share `/` and both use `?type=`, with
  // `q` as the arbiter: with a query the page is in search mode and `type`
  // filters the results, without one it's Discover and `type` is the tab.
  //
  // Singular in the URL to match the vocabulary search already uses there;
  // plural internally because that's what the store calls its sections.
  const activeMediaType = computed<DiscoverMediaType>(() =>
    route.query.type === "series" ? "series" : "movies",
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

    try {
      const response = await $fetch<{
        success: boolean;
        data: PaginatedResponse<NormalizedSearchResult>;
      }>(`/api/v1/discover/${mediaType}`, {
        baseURL: publicConfig.apiBase,
        credentials: "include",
        query: {
          lang: locale.value,
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
    } catch {
      section.error = "errors.generic";
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

  // Switching tabs fetches only what isn't there yet. The store keeps both
  // sections with their accumulated pages, so returning to a tab restores it as
  // it was rather than paying for a full multi-region merge again — one TMDB
  // call per configured country, plus another round whenever the watched filter
  // trims too much, plus one /tv/{id} per partially-watched series.
  async function ensureActiveLoaded() {
    const mediaType = activeMediaType.value;
    if (store[mediaType].results.length > 0) return;
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
