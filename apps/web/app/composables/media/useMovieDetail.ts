// apps/web/app/composables/media/useMovieDetail.ts
import type { MovieDetailResponse } from "@foundit/types";

export function useMovieDetail(id: number) {
  const { apiFetch } = useApi();

  return useAsyncData(`movie-${id}`, () =>
    apiFetch<{ success: boolean; data: MovieDetailResponse }>(
      `/api/v1/movies/${id}`,
    ).then((res) => res.data),
  );
}
