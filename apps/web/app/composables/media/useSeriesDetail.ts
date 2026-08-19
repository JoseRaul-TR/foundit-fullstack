// apps/web/app/composables/media/useSeriesDetail.ts
import type { SeriesDetailResponse } from "@foundit/types";

/** Same reasoning as useMovieDetail — see #218. */
export function useSeriesDetail(id: number) {
  const { apiFetch } = useApi();
  const { locale } = useLocale();

  return useAsyncData(
    computed(() => `series-${id}-${locale.value}`),
    () =>
      apiFetch<{ success: boolean; data: SeriesDetailResponse }>(
        `/api/v1/series/${id}`,
      ).then((res) => res.data),
    { watch: [locale] },
  );
}
