// apps/web/app/composables/watchlist/useWatchlistQuery.ts
//
// One page at a time, fetched as the user scrolls. It used to load every page
// up front so the filter tabs and sort control could work entirely in the
// browser (#70's acceptance criteria asked for exactly that) — which meant a
// render enriched 95 items from TMDB and opened one database connection per
// request against a pool of ten. #234 moved the filtering and sorting to the
// server, where the pagination already was.
import { useInfiniteQuery } from "@tanstack/vue-query";
import type {
  PaginatedResponse,
  WatchlistItemResponse,
  WatchlistSort,
} from "@foundit/types";
import type { ListParams } from "../library/useListParams";
import type { Ref } from "vue";

/**
 * The prefix, without the locale or the parameters. Mutations match on this so
 * a patch reaches every cached variant at once — `invalidateQueries` and
 * `getQueriesData` match by prefix, `getQueryData` does not. See
 * useWatchlistMutations.
 */
export const WATCHLIST_QUERY_KEY = ["watchlist"] as const;

/** The sort fields the API still accepts; `title` was retired in #234. */
export const WATCHLIST_SORTS = ["added", "year"] as const;
export const DEFAULT_WATCHLIST_SORT: WatchlistSort = "added";

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

export type WatchlistParams = ListParams<WatchlistSort>;
export type WatchlistPage = PaginatedResponse<WatchlistItemResponse>;

/**
 * The answer depends on the language *and* on the filter, so the key names
 * both (#218). Without the locale, the first language to load the list served
 * every other one from cache; without the parameters, switching to Series
 * would read the cached All.
 */
export function watchlistQueryKey(locale: string, params: WatchlistParams) {
  return [...WATCHLIST_QUERY_KEY, locale, params] as const;
}

/**
 * The locale is in the key but not in the query string: `apiFetch` puts
 * `lang: locale.value` on everything it sends. Both read the same
 * `useLocale()` ref, so they cannot disagree — don't "fix" this by passing the
 * locale through, it is already there.
 */
function fetchWatchlistPage(
  apiFetch: ApiFetch,
  params: WatchlistParams,
  page: number,
): Promise<WatchlistPage> {
  return apiFetch<{ success: boolean; data: WatchlistPage }>(
    "/api/v1/watchlist",
    { query: { ...params, page } },
  ).then((res) => res.data);
}

function getNextPageParam(lastPage: WatchlistPage): number | undefined {
  return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
}

/**
 * The query's definition in one place, so `useInfiniteQuery` on the client and
 * `prefetchInfiniteQuery` on the server cannot disagree about it (#192).
 *
 * `prefetchInfiniteQuery` fetches the first page only, which is the whole
 * point: SSR now pays 20 TMDB calls and two database queries instead of
 * everything the account has.
 *
 * Takes plain values rather than refs: the prefetch runs once, on the server,
 * against the locale and the parameters the request came in with.
 *
 * `enabled` stays out — it belongs to the client observer, the prefetch
 * ignores it, and on the server the `authenticated` middleware has already
 * established there is a session.
 */
export function watchlistQueryOptions(
  apiFetch: ApiFetch,
  locale: string,
  params: WatchlistParams,
) {
  return {
    queryKey: watchlistQueryKey(locale, params),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchWatchlistPage(apiFetch, params, pageParam),
    initialPageParam: 1,
    getNextPageParam,
  };
}

export function useWatchlistQuery(params: Ref<WatchlistParams>) {
  const { apiFetch } = useApi();
  const { locale } = useLocale();
  const authStore = useAuthStore();

  return useInfiniteQuery({
    // A computed key rather than the factory's frozen one: changing the
    // language or the filter has to start a new query without waiting for a
    // route change to remount the page.
    queryKey: computed(() => watchlistQueryKey(locale.value, params.value)),
    queryFn: ({ pageParam }) =>
      fetchWatchlistPage(apiFetch, params.value, pageParam),
    initialPageParam: 1,
    getNextPageParam,
    enabled: computed(() => authStore.isAuthenticated),
  });
}
