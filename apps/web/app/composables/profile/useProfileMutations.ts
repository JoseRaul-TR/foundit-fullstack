// apps/web/app/composables/profile/useProfileMutations.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  ProfileCountry,
  ProfileResponse,
  ProfileStreamingService,
} from "@foundit/types";
import { PROFILE_QUERY_KEY } from "./useProfile";

export function useUpdateNameMutation() {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const profileStore = useProfileStore();

  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ success: boolean; data: ProfileResponse }>("/api/v1/profile", {
        method: "PUT",
        body: { name },
      }).then((res) => res.data),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      profileStore.setCountries(profile.countries);
      profileStore.setServices(profile.services);
      profileStore.setAgeRatingCountry(profile.ageRatingCountry);
    },
  });
}

export function useAddCountryMutation() {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const profileStore = useProfileStore();

  return useMutation({
    mutationFn: (countryCode: string) =>
      apiFetch<{ success: boolean; data: ProfileCountry[] }>(
        "/api/v1/profile/countries",
        {
          method: "POST",
          body: { countryCode },
        },
      ).then((res) => res.data),
    onSuccess: (countries) => {
      profileStore.setCountries(countries);
      return queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useRemoveCountryMutation() {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const profileStore = useProfileStore();

  return useMutation({
    mutationFn: (countryCode: string) =>
      apiFetch<{ success: boolean; data: ProfileCountry[] }>(
        `/api/v1/profile/countries/${countryCode}`,
        { method: "DELETE" },
      ).then((res) => res.data),
    onSuccess: (countries) => {
      profileStore.setCountries(countries);
      // Removing a country cascades to remove its services server-side
      // (see services/profile/countries.ts's transaction) — invalidate
      // the whole profile query so services refetch too, since this
      // response only carries the updated countries list.
      return queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useAddServiceMutation() {
  const { apiFetch } = useApi();
  const profileStore = useProfileStore();

  return useMutation({
    mutationFn: (input: { providerId: number; countryCode: string }) =>
      apiFetch<{ success: boolean; data: ProfileStreamingService[] }>(
        "/api/v1/profile/services",
        { method: "POST", body: input },
      ).then((res) => res.data),
    onSuccess: (services) => profileStore.setServices(services),
  });
}

export function useRemoveServiceMutation() {
  const { apiFetch } = useApi();
  const profileStore = useProfileStore();

  return useMutation({
    mutationFn: (input: { providerId: number; countryCode: string }) =>
      apiFetch<{ success: boolean; data: ProfileStreamingService[] }>(
        `/api/v1/profile/services/${input.providerId}/${input.countryCode}`,
        { method: "DELETE" },
      ).then((res) => res.data),
    onSuccess: (services) => profileStore.setServices(services),
  });
}

export function useUpdateAgeRatingCountryMutation() {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const profileStore = useProfileStore();

  return useMutation({
    mutationFn: (ageRatingCountry: string) =>
      apiFetch<{ success: boolean; data: ProfileResponse }>("/api/v1/profile", {
        method: "PUT",
        body: { ageRatingCountry },
      }).then((res) => res.data),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      profileStore.setCountries(profile.countries);
      profileStore.setServices(profile.services);
      profileStore.setAgeRatingCountry(profile.ageRatingCountry);
    },
  });
}

export function useDeleteAccountMutation() {
  const { apiFetch } = useApi();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>("/api/v1/profile", { method: "DELETE" }),
  });
}
