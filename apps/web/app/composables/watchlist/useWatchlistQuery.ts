// apps/web/app/composables/watchlist/useWatchlistQuery.ts
//
// Loads every page up front so the page's filter tabs / sort controls can
// operate entirely client-side afterward (#70's acceptance criteria calls
// for this explicitly) -- the API itself still supports server-side
// type/sort/page params for any other future consumer, this composable
// just doesn't use them beyond the first request.
import { useQuery } from "@tanstack/vue-query";
import type { PaginatedResponse, WatchlistItemResponse } from "@foundit/types";

export const WATCHLIST_QUERY_KEY = ["watchlist"] as const;

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

/**
 * The query's definition, in one place, so `useQuery` on the client and
 * `queryClient.prefetchQuery` on the server cannot disagree about it (#192).
 *
 * `enabled` stays out: it belongs to the client observer, `prefetchQuery`
 * ignores it, and on the server the `authenticated` middleware has already
 * established there is a session.
 */
export function watchlistQueryOptions(apiFetch: ApiFetch) {
  return {
    queryKey: WATCHLIST_QUERY_KEY,
    queryFn: async () => {
      const fetchPage = (page: number) =>
        apiFetch<{
          success: boolean;
          data: PaginatedResponse<WatchlistItemResponse>;
        }>("/api/v1/watchlist", {
          query: { type: "all", sort: "added", page },
        }).then((res) => res.data);

      // Page 1 awaited, the rest in parallel: N requests but two round trips,
      // whatever the list length. Measured 19 Aug: 76 items over 4 pages.
      const first = await fetchPage(1);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
          fetchPage(i + 2),
        ),
      );
      return [first.results, ...rest.map((p) => p.results)].flat();
    },
  };
}

export function useWatchlistQuery() {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();

  return useQuery({
    ...watchlistQueryOptions(apiFetch),
    enabled: computed(() => authStore.isAuthenticated),
  });
}
