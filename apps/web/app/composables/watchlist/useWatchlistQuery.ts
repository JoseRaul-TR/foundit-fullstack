// apps/web/app/composables/watchlist/useWatchlistQuery.ts
//
// Loads every page up front so the page's filter tabs / sort controls can
// operate entirely client-side afterward (#70's acceptance criteria calls
// for this explicitly) -- the API itself still supports server-side
// type/sort/page params for any other future consumer, this composable
// just doesn't use them beyond the first request. #234 revisits that.
import { useQuery } from "@tanstack/vue-query";
import type { PaginatedResponse, WatchlistItemResponse } from "@foundit/types";

/**
 * The prefix, without the locale. Mutations match on this so a patch reaches
 * every cached language at once — `invalidateQueries` and `getQueriesData`
 * match by prefix, `getQueryData` does not. See useWatchlistMutations.
 */
export const WATCHLIST_QUERY_KEY = ["watchlist"] as const;

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

/**
 * The answer depends on the language, so the key names it (#218). Without
 * this, the first language to load the list serves every other one from
 * cache and nothing refetches.
 */
export function watchlistQueryKey(locale: string) {
  return [...WATCHLIST_QUERY_KEY, locale] as const;
}

/**
 * The locale is in the key but not in the request: `apiFetch` puts
 * `lang: locale.value` on everything it sends. Both read the same
 * `useLocale()` ref, so they cannot disagree — don't "fix" this by passing
 * the locale through to the query string, it is already there.
 */
function fetchWatchlist(apiFetch: ApiFetch) {
  const fetchPage = (page: number) =>
    apiFetch<{
      success: boolean;
      data: PaginatedResponse<WatchlistItemResponse>;
    }>("/api/v1/watchlist", {
      query: { type: "all", sort: "added", page },
    }).then((res) => res.data);

  // Page 1 awaited, the rest in parallel: N requests but two round trips,
  // whatever the list length. Measured 19 Aug: 76 items over 4 pages.
  return (async () => {
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
        fetchPage(i + 2),
      ),
    );
    return [first.results, ...rest.map((p) => p.results)].flat();
  })();
}

/**
 * The query's definition, in one place, so `useQuery` on the client and
 * `queryClient.prefetchQuery` on the server cannot disagree about it (#192).
 *
 * Takes a plain string rather than a ref: `prefetchQuery` runs once, on the
 * server, against the locale the request came in with. Same split as
 * `providersQueryOptions`.
 *
 * `enabled` stays out: it belongs to the client observer, `prefetchQuery`
 * ignores it, and on the server the `authenticated` middleware has already
 * established there is a session.
 */
export function watchlistQueryOptions(apiFetch: ApiFetch, locale: string) {
  return {
    queryKey: watchlistQueryKey(locale),
    queryFn: () => fetchWatchlist(apiFetch),
  };
}

export function useWatchlistQuery() {
  const { apiFetch } = useApi();
  const { locale } = useLocale();
  const authStore = useAuthStore();

  return useQuery({
    // A computed key rather than the factory's frozen one: switching language
    // refetches without waiting for the route change to remount the page.
    queryKey: computed(() => watchlistQueryKey(locale.value)),
    queryFn: () => fetchWatchlist(apiFetch),
    enabled: computed(() => authStore.isAuthenticated),
  });
}
