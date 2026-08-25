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

type ApiFetch = ReturnType<typeof useApi>["apiFetch"];

/**
 * The query's definition, in one place, so `useQuery` on the client and
 * `queryClient.prefetchQuery` on the server cannot disagree about it (#192).
 *
 * Writing the key twice is how a prefetch fails silently: it fills a cache
 * entry nobody reads, the payload ships full, and the page stays exactly as
 * broken while looking implemented.
 *
 * `enabled` deliberately stays out of here. It belongs to the client observer;
 * `prefetchQuery` ignores it, and on the server the `authenticated` middleware
 * has already established there is a session.
 */
export function profileQueryOptions(apiFetch: ApiFetch) {
  return {
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () =>
      apiFetch<{ success: boolean; data: ProfileResponse }>(
        "/api/v1/profile",
      ).then((res) => res.data),
  };
}

export function useProfileQuery() {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();
  const profileStore = useProfileStore();

  const query = useQuery({
    ...profileQueryOptions(apiFetch),
    enabled: computed(() => authStore.isAuthenticated),
  });

  // Fires on the server too, once the data is prefetched — which is how the
  // country pills reach the initial HTML without any new code: the watcher
  // fills profileStore, and Pinia serializes it into the payload.
  //
  // { immediate: true } also means this fires on every fresh mount with whatever
  // the cache holds — so the cache, not the store, is authoritative. Any mutation
  // that writes profileStore without writing the cache is undone here the next
  // time a component mounts (#196).
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
