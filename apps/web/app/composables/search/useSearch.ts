// apps/web/app/composables/search/useSearch.ts
import type { NormalizedSearchResult, PaginatedResponse } from "@foundit/types";
import type { SearchType } from "~/stores/search";

export function useSearch() {
  const store = useSearchStore();
  const { apiFetch } = useApi();
  const localePath = useLocalePath();
  const router = useRouter();

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
      // No `lang` here, and no baseURL: apiFetch adds the locale from the same
      // useLocale() this used to read, and resolves loopback vs public origin
      // itself. Two sources for one parameter is how #208 happened.
      const response = await apiFetch<{
        success: boolean;
        data: PaginatedResponse<NormalizedSearchResult>;
      }>("/api/v1/search", {
        query: {
          q: store.query,
          type: store.type,
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
    } catch (error) {
      if (id !== requestId) return;
      // apiFetch has already cleared the session and started the navigation to
      // login. An error banner on top of that describes nothing that happened.
      if (isUnauthorized(error)) return;
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
  //
  // `tab` is carried forward rather than rebuilt: it belongs to Discover, not
  // to search, and dropping it is what made leaving and re-entering search
  // land on the wrong tab (#206). It is read from the router and not from a
  // `useRoute()` captured in setup — this runs from a debounce, long after
  // setup, and an injected route is a snapshot. Same trap as #183.
  async function search(query: string, type: SearchType) {
    const { tab } = router.currentRoute.value.query;
    await navigateTo(
      localePath({
        path: "/",
        query: { q: query, type, ...(tab ? { tab } : {}) },
      }),
      { replace: true },
    );
  }

  async function fetchNextPage() {
    if (store.loading || !store.hasMore) return;
    await fetchPage(store.page + 1);
  }

  // Returns to Discover on the tab the user left, not on the default one.
  async function clear() {
    const { tab } = router.currentRoute.value.query;
    await navigateTo(localePath({ path: "/", query: tab ? { tab } : {} }), {
      replace: true,
    });
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
