// apps/web/app/composables/history/useHistoryQuery.ts
import { useQuery } from "@tanstack/vue-query";
import type { HistoryItemResponse, PaginatedResponse } from "@foundit/types";

export const HISTORY_QUERY_KEY = ["history"] as const;

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

/** Same reasoning as watchlistQueryKey — see #218. */
export function historyQueryKey(locale: string) {
  return [...HISTORY_QUERY_KEY, locale] as const;
}

/**
 * What the page draws, which is less than the endpoint knows: it has no use
 * for watchedSeasons, and reads a flat item rather than branching on
 * mediaType in the template. The endpoint keeps the richer shape on purpose
 * — returning only what today's single consumer happens to render is a
 * decision that gets paid for by the next one.
 */
export interface NormalizedHistoryItem {
  tmdbId: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
  rating: number | null;
  /**
   * Date in the shared type, ISO string on the wire. `new Date()` takes
   * either, which is how WatchlistItemResponse.addedAt gets away with the
   * same thing on the sibling page. Naming it Date here stops this file
   * fighting a contract it does not own — the wire-versus-domain split is a
   * wider problem than one composable.
   */
  sortDate: Date;
  numberOfSeasons?: number;
}

function normalize(item: HistoryItemResponse): NormalizedHistoryItem {
  return {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    title: item.tmdb.title,
    posterPath: item.tmdb.posterPath,
    year: item.tmdb.year,
    rating: item.rating,
    sortDate: item.lastWatchedAt,
    numberOfSeasons:
      item.mediaType === "series" ? item.tmdb.numberOfSeasons : undefined,
  };
}

/**
 * Still every page, still flattened here. What #234 changed is that there is
 * one sequence instead of two: the endpoint returns movies and series in one
 * ordered list, so the browser no longer fetches both in full and merges
 * them by hand — which is the thing that made the page impossible to
 * paginate in the first place.
 *
 * The loop itself is the other half of #234 and goes with the infinite
 * scroll. Until it does, a render still enriches every item rather than
 * twenty, so this is not yet the fix for the page's TTFB.
 *
 * The locale rides in the key, not the request — see useWatchlistQuery.
 */
async function fetchHistory(
  apiFetch: ApiFetch,
): Promise<NormalizedHistoryItem[]> {
  const fetchPage = (page: number) =>
    apiFetch<{
      success: boolean;
      data: PaginatedResponse<HistoryItemResponse>;
    }>("/api/v1/history", { query: { page } }).then((res) => res.data);

  // Page 1 awaited, the rest in parallel: N requests but two round trips,
  // whatever the list length. Same shape as fetchWatchlist.
  const first = await fetchPage(1);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      fetchPage(i + 2),
    ),
  );

  return [first.results, ...rest.map((p) => p.results)].flat().map(normalize);
}

/** Same reasoning as watchlistQueryOptions — see #192, #218. */
export function historyQueryOptions(apiFetch: ApiFetch, locale: string) {
  return {
    queryKey: historyQueryKey(locale),
    queryFn: () => fetchHistory(apiFetch),
  };
}

export function useHistoryQuery() {
  const { apiFetch } = useApi();
  const { locale } = useLocale();
  const authStore = useAuthStore();

  return useQuery({
    queryKey: computed(() => historyQueryKey(locale.value)),
    queryFn: () => fetchHistory(apiFetch),
    enabled: computed(() => authStore.isAuthenticated),
  });
}
