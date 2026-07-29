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

  // Groups the user's own subscriptions by country -> one /discover call
  // per country server-side, providers OR'd within each (see discover.ts's
  // multi-region merge). undefined (not "[]") when the user has no
  // subscriptions configured yet, so the backend falls back to its
  // unfiltered legacy behavior instead of returning zero regions = zero
  // results.
  function buildRegionsParam(): string | undefined {
    const entries = Object.entries(profileStore.subscribedServices);
    if (entries.length === 0) return undefined;
    const selected = store.filters.selectedProviderIds;
    if (selected !== null && selected.length === 0) return undefined;

    const regions = entries
      .map(([countryCode, services]) => ({
        countryCode,
        providerIds: selected
          ? services
              .map((s) => s.providerId)
              .filter((id) => selected.includes(id))
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

  async function loadInitial() {
    store.resetSection("movies");
    store.resetSection("series");
    await Promise.all([fetchPage("movies", 1), fetchPage("series", 1)]);
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
    loadInitial,
    fetchNextPage,
    applyFilters: loadInitial,
    resetFilters: () => {
      store.resetFilters();
      return loadInitial();
    },
  };
}
