// apps/web/app/composables/profile/useProfile.ts
//
// The ONE useQuery(['profile']) call in the app. Both the Profile page
// and Discover (via useDiscoverProfile) build on this — TanStack Query
// dedupes concurrent callers, so there's a single network fetch even if
// both mount around the same time, and a single place syncing the result
// into profileStore.
import { useQuery } from "@tanstack/vue-query";
import type { ProfileResponse } from "@foundit/types";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export function useProfileQuery() {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();
  const profileStore = useProfileStore();

  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () =>
      apiFetch<{ success: boolean; data: ProfileResponse }>(
        "/api/v1/profile",
      ).then((res) => res.data),
    enabled: computed(() => authStore.isAuthenticated),
  });

  watch(
    query.data,
    (profile) => {
      if (!profile) return;
      profileStore.setCountries(profile.countries);
      profileStore.setServices(profile.services);
      profileStore.setAgeRatingCountry(profile.ageRatingCountry);
    },
    { immediate: true },
  );

  return query;
}
