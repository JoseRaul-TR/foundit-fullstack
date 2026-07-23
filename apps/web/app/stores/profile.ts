// apps/web/app/stores/profile.ts
//
// Global profile config state — countries, subscribed streaming
// services, and the (independent) age-rating region. Populated
// on-demand (no dedicated init plugin, unlike auth: profile config only
// applies to authenticated users and isn't needed to gate the first
// render), typically wherever the Profile page or highlight-calculating
// components fetch /api/v1/profile.
import { defineStore } from "pinia";
import type { ProfileCountry, ProfileStreamingService } from "@foundit/types";

export const useProfileStore = defineStore("profile", () => {
  const countries = ref<ProfileCountry[]>([]);

  // Raw flat list, matching ProfileResponse.services exactly — kept
  // internal-ish under its API-accurate name; components should read
  // `subscribedServices` below instead.
  const services = ref<ProfileStreamingService[]>([]);

  // ageRatingCountry doesn't exist in ProfileResponse yet (see the
  // follow-up API ticket). Wired now so nothing else needs to change in
  // this store once the backend field lands — stays null until then.
  const ageRatingCountry = ref<string | null>(null);

  // Grouped by country for highlight-calculation components — a user can
  // be subscribed to different services in Sweden vs Spain, so a flat
  // list alone can't answer "is this available for me in the country
  // I'm currently browsing."
  const subscribedServices = computed<
    Record<string, ProfileStreamingService[]>
  >(() => {
    const grouped: Record<string, ProfileStreamingService[]> = {};
    for (const service of services.value) {
      (grouped[service.countryCode] ??= []).push(service);
    }
    return grouped;
  });

  function setCountries(newCountries: ProfileCountry[]) {
    countries.value = newCountries;
  }

  function setServices(newServices: ProfileStreamingService[]) {
    services.value = newServices;
  }

  function setAgeRatingCountry(countryCode: string | null) {
    ageRatingCountry.value = countryCode;
  }

  return {
    countries,
    subscribedServices,
    ageRatingCountry,
    setCountries,
    setServices,
    setAgeRatingCountry,
  };
});
