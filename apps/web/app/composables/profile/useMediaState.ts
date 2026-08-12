// apps/web/app/composables/profile/useMediaState.ts
//
// One query, shared by every card on screen. The endpoint returns identifiers
// only, so this is the cheap answer to "is this on my list / have I seen it" —
// the expensive one was loading the whole watchlist and history and paging
// through complete objects to end up with two lists of numbers.
import { useQuery } from "@tanstack/vue-query";
import type { MediaStateResponse, MediaStateSeries } from "@foundit/types";

export const MEDIA_STATE_QUERY_KEY = ["media-state"] as const;

export function useMediaStateQuery() {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();

  return useQuery({
    queryKey: MEDIA_STATE_QUERY_KEY,
    queryFn: () =>
      apiFetch<{ success: boolean; data: MediaStateResponse }>(
        "/api/v1/profile/media-state",
      ).then((res) => res.data),
    enabled: computed(() => authStore.isAuthenticated),
  });
}

interface DerivedState {
  watchlistKeys: Set<string>;
  watchedMovies: Set<number>;
  seriesById: Map<number, MediaStateSeries>;
}

// Keyed by the payload object, so the sets are built once per response no
// matter how many cards ask for them — a grid of twenty would otherwise each
// build its own copy of the same few hundred entries. A WeakMap rather than a
// plain one: it holds no strong reference, and on the server each request has
// its own query client and therefore its own payload object, so nothing leaks
// between requests.
const derivedByPayload = new WeakMap<MediaStateResponse, DerivedState>();

function derive(data: MediaStateResponse): DerivedState {
  const cached = derivedByPayload.get(data);
  if (cached) return cached;

  const derived: DerivedState = {
    watchlistKeys: new Set(
      data.watchlist.map((item) => `${item.mediaType}:${item.tmdbId}`),
    ),
    watchedMovies: new Set(data.watchedMovies),
    seriesById: new Map(data.watchedSeries.map((s) => [s.tmdbId, s])),
  };
  derivedByPayload.set(data, derived);
  return derived;
}

const EMPTY: DerivedState = {
  watchlistKeys: new Set(),
  watchedMovies: new Set(),
  seriesById: new Map(),
};

export function useMediaState() {
  const query = useMediaStateQuery();
  const state = computed(() =>
    query.data.value ? derive(query.data.value) : EMPTY,
  );

  function isInWatchlist(tmdbId: number, mediaType: string): boolean {
    return state.value.watchlistKeys.has(`${mediaType}:${tmdbId}`);
  }

  // "Watched" means finished, and for a series that is narrower than having
  // seen every season: a series still in production comes back as upToDate,
  // not complete, precisely so it isn't labelled as finished when it isn't.
  function isWatched(tmdbId: number, mediaType: string): boolean {
    if (mediaType === "movie") return state.value.watchedMovies.has(tmdbId);
    if (mediaType === "series") {
      return state.value.seriesById.get(tmdbId)?.state === "complete";
    }
    return false;
  }

  function seriesProgress(tmdbId: number): MediaStateSeries | undefined {
    return state.value.seriesById.get(tmdbId);
  }

  return { isInWatchlist, isWatched, seriesProgress, pending: query.isPending };
}
