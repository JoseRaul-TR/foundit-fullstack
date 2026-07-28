// apps/web/app/composables/media/useSeriesDetail.ts
import type { SeriesDetailResponse } from "@foundit/types";

export function useSeriesDetail(id: number) {
  const { apiFetch } = useApi();

  return useAsyncData(`series-${id}`, () =>
    apiFetch<{ success: boolean; data: SeriesDetailResponse }>(
      `/api/v1/series/${id}`,
    ).then((res) => res.data),
  );
}
