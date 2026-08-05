// apps/web/app/composables/profile/useCountriesQuery.ts
import { useQuery } from "@tanstack/vue-query";
import type { CountryItem } from "@foundit/types";

export function useCountriesQuery() {
  const { apiFetch } = useApi();
  return useQuery({
    queryKey: ["countries"],
    queryFn: () =>
      apiFetch<{ success: boolean; data: CountryItem[] }>(
        "/api/v1/countries",
      ).then((res) => res.data),
    staleTime: Infinity, // country catalog barely changes
  });
}
