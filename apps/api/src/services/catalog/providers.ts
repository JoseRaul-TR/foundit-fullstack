// apps/api/src/services/catalog/providers.ts

import { getOrSetCache, ONE_DAY_MS } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { fetchTmdb } from "@/lib/tmdb";
import type { TmdbWatchProviderListResponse } from "@/types/tmdb.types";
import type { ProviderItem } from "@foundit/types";

function dedupeById(providers: ProviderItem[]): ProviderItem[] {
  const seen = new Map<number, ProviderItem>();
  for (const provider of providers) {
    if (!seen.has(provider.providerId)) seen.set(provider.providerId, provider);
  }
  return [...seen.values()];
}

async function syncStreamingServices(
  region: string,
  providers: ProviderItem[],
): Promise<void> {
  await Promise.all(
    providers.map((provider) =>
      prisma.streamingService.upsert({
        where: {
          countryCode_providerId: {
            countryCode: region,
            providerId: provider.providerId,
          },
        },
        create: {
          countryCode: region,
          providerId: provider.providerId,
          name: provider.name,
          logoPath: provider.logoPath,
        },
        update: { name: provider.name, logoPath: provider.logoPath },
      }),
    ),
  );
}

export async function getProviders(region: string): Promise<ProviderItem[]> {
  return getOrSetCache(`providers:${region}`, ONE_DAY_MS, async () => {
    const [movieRes, seriesRes] = await Promise.all([
      fetchTmdb<TmdbWatchProviderListResponse>("/watch/providers/movie", {
        watch_region: region,
      }),
      fetchTmdb<TmdbWatchProviderListResponse>("/watch/providers/tv", {
        watch_region: region,
      }),
    ]);
    const merged = dedupeById(
      [...movieRes.results, ...seriesRes.results].map((provider) => ({
        providerId: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path,
      })),
    );
    await syncStreamingServices(region, merged);
    return merged;
  });
}
