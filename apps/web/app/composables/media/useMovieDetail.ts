// apps/web/app/composables/media/useMovieDetail.ts
import type { MovieDetailResponse } from "@foundit/types";

/**
 * The title and overview come from TMDB in the active language, so the key
 * names it (#218). Without it, opening a film in Spanish and switching to
 * Swedish leaves the cached Spanish answer looking valid.
 *
 * The `watch` is deliberate rather than redundant: useAsyncData's key is not
 * the reactive instrument a TanStack queryKey is, and relying on it to
 * refetch would be an assumption about Nuxt's internals rather than a
 * measurement. The key keeps the two languages in separate cache entries;
 * the watch is what asks for the second one.
 */
export function useMovieDetail(id: number) {
  const { apiFetch } = useApi();
  const { locale } = useLocale();

  return useAsyncData(
    computed(() => `movie-${id}-${locale.value}`),
    () =>
      apiFetch<{ success: boolean; data: MovieDetailResponse }>(
        `/api/v1/movies/${id}`,
      ).then((res) => res.data),
    { watch: [locale] },
  );
}
