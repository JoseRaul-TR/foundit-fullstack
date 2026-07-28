// apps/web/app/composables/discover/useDiscoverProfile.ts
//
// Populates profileStore (countries/services/ageRatingCountry) for
// Discover's own use — countries/services feed the multi-region `regions`
// param, ageRatingCountry feeds the AgeRating filter. Keyed as a single
// useAsyncData("profile") call so it's SSR-safe and de-duped against any
// other component that might fetch the same endpoint under the same key
// (e.g. a future Profile page composable).
import type { ProfileResponse } from "@foundit/types";

export function useDiscoverProfile() {
  const { apiFetch } = useApi();
  const authStore = useAuthStore();
  const profileStore = useProfileStore();

  const { data, pending } = useAsyncData(
    "profile",
    () =>
      apiFetch<{ success: boolean; data: ProfileResponse }>(
        "/api/v1/profile",
      ).then((res) => res.data),
    { immediate: authStore.isAuthenticated },
  );

  watch(
    data,
    (profile) => {
      if (!profile) return;
      profileStore.setCountries(profile.countries);
      profileStore.setServices(profile.services);
      profileStore.setAgeRatingCountry(profile.ageRatingCountry);
    },
    { immediate: true },
  );

  return { pending };
}