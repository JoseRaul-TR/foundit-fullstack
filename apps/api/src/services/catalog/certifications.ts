// apps/api/src/services/catalog/certifications.ts
import { getOrSetCache, ONE_WEEK_MS } from "@/lib/cache";
import { fetchTmdb } from "@/lib/tmdb";
import type { TmdbCertificationsResponse } from "@/types/tmdb.types";
import type { CertificationItem } from "@foundit/types";

export type CertificationMediaType = "movie" | "series";

const MEDIA_TYPE_TO_TMDB_PATH: Record<CertificationMediaType, string> = {
  movie: "/certification/movie/list",
  series: "/certification/tv/list",
};

/**
 * Cached weekly, same cadence as genres — certification lists are
 * effectively static (TMDB doesn't add/remove ratings often).
 *
 * Returns [] for a country TMDB has no certifications for, rather than
 * throwing — the AgeRating filter should just show no options for that
 * country, not break the page.
 */
export async function getCertifications(
  mediaType: CertificationMediaType,
  countryCode: string,
): Promise<CertificationItem[]> {
  return getOrSetCache(
    `certifications:${mediaType}:${countryCode}`,
    ONE_WEEK_MS,
    async () => {
      const response = await fetchTmdb<TmdbCertificationsResponse>(
        MEDIA_TYPE_TO_TMDB_PATH[mediaType],
        {},
      );
      const entries = response.certifications[countryCode] ?? [];
      return entries
        .map((e) => ({ certification: e.certification, order: e.order }))
        .sort((a, b) => a.order - b.order);
    },
  );
}

/**
 * Builds a certification -> order lookup for a country, used by
 * discover.ts's bounded post-filter (series has no native TMDB
 * certification param, so "X or below" has to be computed ourselves
 * against TMDB's own per-country ordering).
 */
export async function getCertificationOrderMap(
  mediaType: CertificationMediaType,
  countryCode: string,
): Promise<Map<string, number>> {
  const items = await getCertifications(mediaType, countryCode);
  return new Map(items.map((item) => [item.certification, item.order]));
}
