// apps/web/app/composables/useSearch.ts
import type { NormalizedSearchResult, PaginatedResponse } from "@foundit/types";
import type { SearchType } from "~/stores/search";

export function useSearch() {
  const store = useSearchStore();
  const { public: publicConfig } = useRuntimeConfig();
  const { locale } = useLocale();

  async function fetchPage(page: number) {
    if (store.loading) return;
    store.loading = true;
    store.error = null;

    try {
      const response = await $fetch<{
        success: boolean;
        data: PaginatedResponse<NormalizedSearchResult>;
      }>("/api/v1/search", {
        baseURL: publicConfig.apiBase,
        query: {
          q: store.query,
          type: store.type,
          lang: locale.value,
          page,
        },
      });

      store.results =
        page === 1
          ? response.data.results
          : [...store.results, ...response.data.results];
      store.page = response.data.page;
      store.totalPages = response.data.totalPages;
    } catch {
      store.error = "errors.generic";
    } finally {
      store.loading = false;
    }
  }

  // Single entry point for both the SSR-critical initial load (awaited in
  // index.vue's useAsyncData) and every later client-side change (typing,
  // switching type, browser back/forward) — index.vue's `watch` option
  // calls this again automatically, so it's the only place that fetches.
  async function loadFromQuery(query: string, type: SearchType) {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      store.clear();
      return;
    }
    store.reset();
    store.query = trimmed;
    store.type = type;
    await fetchPage(1);
  }

  // Called by SearchBar — only updates the URL. index.vue's useAsyncData
  // watcher reacts to the route change and does the actual fetch, so
  // there's exactly one code path that ever calls the API.
  async function search(query: string, type: SearchType) {
    await navigateTo(
      { path: "/", query: { q: query, type } },
      { replace: true },
    );
  }

  async function fetchNextPage() {
    if (store.loading || !store.hasMore) return;
    await fetchPage(store.page + 1);
  }

  function clear() {
    navigateTo({ path: "/" }, { replace: true });
  }

  return {
    query: computed(() => store.query),
    type: computed(() => store.type),
    results: computed(() => store.results),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasMore: computed(() => store.hasMore),
    isIdle: computed(() => store.isIdle),
    search,
    loadFromQuery,
    fetchNextPage,
    clear,
  };
}
