// apps/api/src/services/catalog/countries.ts

import { getOrSetCache, ONE_WEEK_MS } from "@/lib/cache";
import { fetchTmdb } from "@/lib/tmdb";
import type { TmdbWatchProviderRegionsResponse } from "@/types/tmdb.types";
import type { CountryItem } from "@foundit/types";

export async function getCountries(): Promise<CountryItem[]> {
  return getOrSetCache("countries", ONE_WEEK_MS, async () => {
    const response = await fetchTmdb<TmdbWatchProviderRegionsResponse>(
      "/watch/providers/regions",
      {},
    );
    return response.results
      .map((country) => ({
        code: country.iso_3166_1,
        name: country.english_name,
        nativeName: country.native_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}
