// apps/web/app/composables/discover/useCertifications.ts
//
// Feeds the AgeRating filter's two dropdowns (movie/series each have their
// own vocabulary, per José's 2026-07-28 decision). `region` is a Ref so the
// query re-fires if the user's ageRatingCountry setting changes mid-session.
import type { CertificationItem } from "@foundit/types";

export function useCertifications(
  mediaType: "movie" | "series",
  region: Ref<string | null>,
) {
  const { apiFetch } = useApi();

  const { data } = useAsyncData(
    `certifications-${mediaType}`,
    () => {
      if (!region.value) return Promise.resolve([] as CertificationItem[]);
      return apiFetch<{ success: boolean; data: CertificationItem[] }>(
        "/api/v1/certifications",
        { query: { mediaType, region: region.value } },
      ).then((res) => res.data);
    },
    { watch: [region] },
  );

  return { certifications: computed(() => data.value ?? []) };
}
