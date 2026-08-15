// apps/web/app/composables/search/useSearch.ts
import type { NormalizedSearchResult, PaginatedResponse } from "@foundit/types";
import type { SearchType } from "~/stores/search";

export function useSearch() {
  const store = useSearchStore();
  const { public: publicConfig } = useRuntimeConfig();
  const { locale } = useLocale();
  const localePath = useLocalePath();

  // Last one wins. The guard here used to be `if (store.loading) return`,
  // which is first-one-wins: a query typed while another was in flight was
  // dropped without a trace, leaving the URL announcing one search and the
  // store holding another. Simply removing it isn't enough either — two
  // answers can arrive out of order and the older one overwrite the newer.
  //
  // A token settles both: every call takes the next number, and only the call
  // that still holds the current one is allowed to write.
  let requestId = 0;

  async function fetchPage(page: number) {
    const id = ++requestId;
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

      if (id !== requestId) return;

      store.results =
        page === 1
          ? response.data.results
          : [...store.results, ...response.data.results];
      store.page = response.data.page;
      store.totalPages = response.data.totalPages;
    } catch {
      if (id !== requestId) return;
      store.error = "errors.generic";
    } finally {
      if (id === requestId) store.loading = false;
    }
  }

  // Single entry point for both the SSR-critical initial load (awaited in
  // index.vue's useAsyncData) and every later client-side change (typing,
  // switching type, browser back/forward) — index.vue's `watch` option
  // calls this again automatically, so it's the only place that fetches.
  async function loadFromQuery(query: string, type: SearchType) {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      // Invalidate anything still in flight before emptying the store, or its
      // answer arrives afterwards and writes results into a search that no
      // longer exists. Reachable now that clearing the field by hand is a real
      // path: type three characters, then delete them before the answer lands.
      requestId++;
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
    await navigateTo(localePath({ path: "/", query: { q: query, type } }), {
      replace: true,
    });
  }

  async function fetchNextPage() {
    if (store.loading || !store.hasMore) return;
    await fetchPage(store.page + 1);
  }

  async function clear() {
    await navigateTo(localePath("/"), { replace: true });
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
