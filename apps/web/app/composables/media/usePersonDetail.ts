// apps/web/app/composables/media/usePersonDetail.ts
import type { PersonDetailResponse } from "@foundit/types";

export function usePersonDetail(id: number) {
  const { apiFetch } = useApi();

  return useAsyncData(`person-${id}`, () =>
    apiFetch<{ success: boolean; data: PersonDetailResponse }>(
      `/api/v1/people/${id}`,
    ).then((res) => res.data),
  );
}
