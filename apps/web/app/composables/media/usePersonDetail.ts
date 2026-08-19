// apps/web/app/composables/media/usePersonDetail.ts
import type { PersonDetailResponse } from "@foundit/types";

/** Same reasoning as useMovieDetail — see #218. */
export function usePersonDetail(id: number) {
  const { apiFetch } = useApi();
  const { locale } = useLocale();

  return useAsyncData(
    computed(() => `person-${id}-${locale.value}`),
    () =>
      apiFetch<{ success: boolean; data: PersonDetailResponse }>(
        `/api/v1/people/${id}`,
      ).then((res) => res.data),
    { watch: [locale] },
  );
}
