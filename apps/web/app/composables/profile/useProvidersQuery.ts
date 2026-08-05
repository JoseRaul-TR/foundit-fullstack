// apps/web/app/composables/profile/useProvidersQuery.ts
import { useQuery } from "@tanstack/vue-query";
import type { ProviderItem } from "@foundit/types";

export function useProvidersQuery(countryCode: Ref<string>) {
  const { apiFetch } = useApi();
  return useQuery({
    queryKey: computed(() => ["providers", countryCode.value] as const),
    queryFn: () =>
      apiFetch<{ success: boolean; data: ProviderItem[] }>(
        "/api/v1/providers",
        {
          query: { region: countryCode.value },
        },
      ).then((res) => res.data),
    enabled: computed(() => !!countryCode.value),
  });
}
