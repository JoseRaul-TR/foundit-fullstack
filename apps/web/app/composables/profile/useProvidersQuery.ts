// apps/web/app/composables/profile/useProvidersQuery.ts
import { useQuery } from "@tanstack/vue-query";
import type { ProviderItem } from "@foundit/types";

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

// Key and fetcher each written once, so the reactive client query and the
// server prefetch cannot drift apart — see #192, where a key written twice is
// named as the way this fails without any error.
function providersQueryKey(countryCode: string) {
  return ["providers", countryCode] as const;
}

function fetchProviders(apiFetch: ApiFetch, countryCode: string) {
  return apiFetch<{ success: boolean; data: ProviderItem[] }>(
    "/api/v1/providers",
    { query: { region: countryCode } },
  ).then((res) => res.data);
}

/** Same reasoning as mediaStateQueryOptions — see #192. */
export function providersQueryOptions(apiFetch: ApiFetch, countryCode: string) {
  return {
    queryKey: providersQueryKey(countryCode),
    queryFn: () => fetchProviders(apiFetch, countryCode),
  };
}

export function useProvidersQuery(countryCode: Ref<string>) {
  const { apiFetch } = useApi();
  return useQuery({
    // The key stays a computed here: the selector switches country without
    // remounting, and the factory takes a plain string.
    queryKey: computed(() => providersQueryKey(countryCode.value)),
    queryFn: () => fetchProviders(apiFetch, countryCode.value),
    enabled: computed(() => !!countryCode.value),
  });
}
