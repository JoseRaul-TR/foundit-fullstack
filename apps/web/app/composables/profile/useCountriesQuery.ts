// apps/web/app/composables/profile/useCountriesQuery.ts
import { useQuery } from "@tanstack/vue-query";
import type { CountryItem } from "@foundit/types";

export const COUNTRIES_QUERY_KEY = ["countries"] as const;

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

/** Same reasoning as profileQueryOptions — see #192. */
export function countriesQueryOptions(apiFetch: ApiFetch) {
  return {
    queryKey: COUNTRIES_QUERY_KEY,
    queryFn: () =>
      apiFetch<{ success: boolean; data: CountryItem[] }>(
        "/api/v1/countries",
      ).then((res) => res.data),
    staleTime: Infinity, // country catalog barely changes
  };
}

export function useCountriesQuery() {
  const { apiFetch } = useApi();
  return useQuery(countriesQueryOptions(apiFetch));
}
