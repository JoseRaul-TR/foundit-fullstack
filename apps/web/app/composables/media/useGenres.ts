// apps/web/app/composables/media/useGenres.ts
//
// Genre names are language-dependent, so the locale is in the key (#218).
// It is NOT in the request: `apiFetch` puts `lang` on everything it sends,
// which is why the old `useAsyncData` could watch the locale while building
// no query of its own.
//
// Moving off useAsyncData also fixes #208's duplicate request: useAsyncData
// dedupes the data by key but each call site registers its own watch, so one
// language change produced two /api/v1/genres — index.vue, DiscoverSection
// and DiscoverFilters all call this. TanStack shares one cache entry per
// language across every caller, with no watcher at all.
import { useQuery } from "@tanstack/vue-query";
import type { GenresResponse } from "@foundit/types";

export const GENRES_QUERY_KEY = ["genres"] as const;

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

export function genresQueryKey(locale: string) {
  return [...GENRES_QUERY_KEY, locale] as const;
}

function fetchGenres(apiFetch: ApiFetch) {
  return apiFetch<{ success: boolean; data: GenresResponse }>(
    "/api/v1/genres",
  ).then((res) => res.data);
}

/**
 * `useQuery` does not fetch during SSR — it registers its observer and waits
 * for a browser (#192). The catalogue therefore has to be prefetched in
 * index.vue, or the first render draws every card without its genre chips.
 *
 * staleTime is Infinity per language: the catalogue barely changes, and the
 * key already distinguishes the languages from each other.
 */
export function genresQueryOptions(apiFetch: ApiFetch, locale: string) {
  return {
    queryKey: genresQueryKey(locale),
    queryFn: () => fetchGenres(apiFetch),
    staleTime: Infinity,
  };
}

export function useGenres() {
  const { apiFetch } = useApi();
  const { locale } = useLocale();

  const { data } = useQuery({
    queryKey: computed(() => genresQueryKey(locale.value)),
    queryFn: () => fetchGenres(apiFetch),
    staleTime: Infinity,
  });

  function getGenreNames(
    genreIds: number[],
    mediaType: "movie" | "series",
  ): string[] {
    const catalog = mediaType === "movie" ? data.value?.movie : data.value?.tv;
    if (!catalog) return [];
    const byId = new Map(catalog.map((g) => [g.id, g.name]));
    return genreIds
      .map((id) => byId.get(id))
      .filter((name): name is string => !!name);
  }

  return {
    getGenreNames,
    // Raw catalogs for DiscoverFilters' genre multi-select. Kept as
    // separate exports rather than overloading getGenreNames, since the
    // filter UI needs {id, name} pairs to render+toggle, not just names.
    movieGenres: computed(() => data.value?.movie ?? []),
    seriesGenres: computed(() => data.value?.tv ?? []),
  };
}
