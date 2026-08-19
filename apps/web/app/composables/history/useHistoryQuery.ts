// apps/web/app/composables/history/useHistoryQuery.ts
import { useQuery } from "@tanstack/vue-query";
import type {
  HistoryMovieItemResponse,
  HistorySeriesItemResponse,
  PaginatedResponse,
} from "@foundit/types";

export const HISTORY_QUERY_KEY = ["history"] as const;

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

export interface NormalizedHistoryItem {
  tmdbId: number;
  mediaType: "movie" | "series";
  title: string;
  posterPath: string | null;
  year: number | null;
  rating: number | null;
  sortDate: string; // ISO string over the wire, despite the Date type server-side
  numberOfSeasons?: number;
}

async function fetchAllPages<T>(
  apiFetch: ApiFetch,
  type: "movie" | "series",
): Promise<T[]> {
  const fetchPage = (page: number) =>
    apiFetch<{ success: boolean; data: PaginatedResponse<T> }>(
      "/api/v1/history",
      { query: { type, page } },
    ).then((res) => res.data);

  const first = await fetchPage(1);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      fetchPage(i + 2),
    ),
  );
  return [first.results, ...rest.map((p) => p.results)].flat();
}

/** Same reasoning as watchlistQueryOptions — see #192. */
export function historyQueryOptions(apiFetch: ApiFetch) {
  return {
    queryKey: HISTORY_QUERY_KEY,
    queryFn: async (): Promise<NormalizedHistoryItem[]> => {
      const [movies, series] = await Promise.all([
        fetchAllPages<HistoryMovieItemResponse>(apiFetch, "movie"),
        fetchAllPages<HistorySeriesItemResponse>(apiFetch, "series"),
      ]);

      const normalizedMovies: NormalizedHistoryItem[] = movies.map((m) => ({
        tmdbId: m.tmdbId,
        mediaType: "movie",
        title: m.tmdb.title,
        posterPath: m.tmdb.posterPath,
        year: m.tmdb.year,
        rating: m.rating,
        sortDate: m.watchedAt as unknown as string,
      }));
      const normalizedSeries: NormalizedHistoryItem[] = series.map((s) => ({
        tmdbId: s.tmdbId,
        mediaType: "series",
        title: s.tmdb.title,
        posterPath: s.tmdb.posterPath,
        year: null,
        rating: s.rating,
        sortDate: s.lastWatchedAt as unknown as string,
        numberOfSeasons: s.tmdb.numberOfSeasons,
      }));

      return [...normalizedMovies, ...normalizedSeries];
    },
  };
}

export function useHistoryQuery() {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();

  return useQuery({
    ...historyQueryOptions(apiFetch),
    enabled: computed(() => authStore.isAuthenticated),
  });
}
