// apps/web/app/composables/history/useHistoryQuery.ts
//
// One page at a time, fetched as the user scrolls. Two commits ago this
// fetched two full sequences and merged them in the browser; one commit ago it
// fetched one sequence in full. It now fetches twenty items — 14 requests and
// 265 TMDB calls per render became one and twenty (#234).
import { useInfiniteQuery } from "@tanstack/vue-query";
import type { HistoryItemResponse, PaginatedResponse } from "@foundit/types";
import type { ListParams } from "../library/useListParams";
import type { Ref } from "vue";

export const HISTORY_QUERY_KEY = ["history"] as const;

/**
 * One field, because there is only one date a history entry has. It still goes
 * through the same shape as the watchlist's so both pages share
 * `useListParams` and the same merged sort control — the difference between
 * the two pages is one extra option, not a different mechanism.
 */
export const HISTORY_SORTS = ["watched"] as const;
export type HistorySort = (typeof HISTORY_SORTS)[number];
export const DEFAULT_HISTORY_SORT: HistorySort = "watched";

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

export type HistoryParams = ListParams<HistorySort>;

/** Same reasoning as watchlistQueryKey — see #218, #234. */
export function historyQueryKey(locale: string, params: HistoryParams) {
  return [...HISTORY_QUERY_KEY, locale, params] as const;
}

/**
 * What the page draws, which is less than the endpoint knows: it has no use
 * for watchedSeasons, and reads a flat item rather than branching on
 * mediaType in the template. The endpoint keeps the richer shape on purpose —
 * returning only what today's single consumer happens to render is a decision
 * that gets paid for by the next one.
 */
export interface NormalizedHistoryItem {
  tmdbId: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
}

export type HistoryPage = PaginatedResponse<NormalizedHistoryItem>;

function normalize(item: HistoryItemResponse): NormalizedHistoryItem {
  return {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    title: item.tmdb.title,
    posterPath: item.tmdb.posterPath,
    year: item.tmdb.year,
  };
}

/**
 * `sort` is not sent: the endpoint has one sort field and therefore no `sort`
 * parameter to hang the direction on — only `order`. It exists in the params
 * object so the two pages can share one composable and one control.
 *
 * The locale rides in the key, not the request — see useWatchlistQuery.
 */
function fetchHistoryPage(
  apiFetch: ApiFetch,
  params: HistoryParams,
  page: number,
): Promise<HistoryPage> {
  return apiFetch<{
    success: boolean;
    data: PaginatedResponse<HistoryItemResponse>;
  }>("/api/v1/history", {
    query: { type: params.type, order: params.order, page },
  }).then((res) => ({ ...res.data, results: res.data.results.map(normalize) }));
}

function getNextPageParam(lastPage: HistoryPage): number | undefined {
  return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
}

/** Same reasoning as watchlistQueryOptions — see #192, #218, #234. */
export function historyQueryOptions(
  apiFetch: ApiFetch,
  locale: string,
  params: HistoryParams,
) {
  return {
    queryKey: historyQueryKey(locale, params),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchHistoryPage(apiFetch, params, pageParam),
    initialPageParam: 1,
    getNextPageParam,
  };
}

export function useHistoryQuery(params: Ref<HistoryParams>) {
  const { apiFetch } = useApi();
  const { locale } = useLocale();
  const authStore = useAuthStore();

  return useInfiniteQuery({
    queryKey: computed(() => historyQueryKey(locale.value, params.value)),
    queryFn: ({ pageParam }) =>
      fetchHistoryPage(apiFetch, params.value, pageParam),
    initialPageParam: 1,
    getNextPageParam,
    enabled: computed(() => authStore.isAuthenticated),
  });
}
