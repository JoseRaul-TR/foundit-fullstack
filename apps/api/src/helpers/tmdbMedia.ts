// apps/api/src/helpers/tmdbMedia.ts

import type {
  TmdbCredits,
  TmdbVideosResponse,
  TmdbWatchProviderEntry,
  TmdbWatchProvidersCountry,
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
} from "src/types/tmdb.types";
import type {
  Provider,
  ProviderType,
  NormalizedSearchResult,
  MediaType,
} from "@foundit/types";

export const MAX_CAST = 10;
export const MAX_RECOMMENDATIONS = 10;

export interface ProvidersByType {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  free: Provider[];
}

export interface NormalizedCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export function parseYear(
  dateString: string | undefined | null,
): number | null {
  if (!dateString) return null;
  const year = Number(dateString.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

export function extractTrailer(
  videos: TmdbVideosResponse | undefined,
): { youtubeKey: string } | null {
  const trailer = videos?.results.find(
    (v) => v.type === "Trailer" && v.site === "YouTube",
  );
  return trailer ? { youtubeKey: trailer.key } : null;
}

export function extractCast(
  credits: TmdbCredits | undefined,
): NormalizedCastMember[] {
  return (credits?.cast ?? []).slice(0, MAX_CAST).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path,
  }));
}

export function extractRecommendations(
  recommendations: TmdbPaginatedResponse<TmdbSearchResultItem> | undefined,
  mediaType: MediaType,
): NormalizedSearchResult[] {
  return (recommendations?.results ?? [])
    .slice(0, MAX_RECOMMENDATIONS)
    .map((item) => ({
      id: item.id,
      mediaType,
      title: item.title ?? item.name ?? "",
      posterPath: item.poster_path,
      year: parseYear(item.release_date ?? item.first_air_date),
      tmdbRating: item.vote_average ?? null,
    }));
}

/**
 * TMDB's `logo_path` can be null; our shared `Provider.logoPath` is typed as
 * a required string, so it's default to "" rather than widen the shared type.
 */
export function toProvider(
  entry: TmdbWatchProviderEntry,
  type: ProviderType,
  countryCode: string,
  subscribedSet: Set<string> | null,
): Provider {
  const isSubscribed =
    subscribedSet?.has(`${countryCode}:${entry.provider_id}`) ?? false;

  return {
    providerId: entry.provider_id,
    name: entry.provider_name,
    logoPath: entry.logo_path ?? "",
    type,
    ...(isSubscribed ? { subscribed: true } : {}),
  };
}

export function buildProviders(
  tmdbProviders: Record<string, TmdbWatchProvidersCountry> | undefined,
  subscribedSet: Set<string> | null,
): Record<string, ProvidersByType> {
  const providers: Record<string, ProvidersByType> = {};
  if (!tmdbProviders) return providers;

  for (const [countryCode, byType] of Object.entries(tmdbProviders)) {
    providers[countryCode] = {
      flatrate: (byType.flatrate ?? []).map((p) =>
        toProvider(p, "flatrate", countryCode, subscribedSet),
      ),
      rent: (byType.rent ?? []).map((p) =>
        toProvider(p, "rent", countryCode, subscribedSet),
      ),
      buy: (byType.buy ?? []).map((p) =>
        toProvider(p, "buy", countryCode, subscribedSet),
      ),
      free: (byType.free ?? []).map((p) =>
        toProvider(p, "free", countryCode, subscribedSet),
      ),
    };
  }

  return providers;
}

/**
 * Distinct provider names the user is subscribed to, across every
 * coountry/type in an already-build providers map. Used for #39's
 * `availableOn` (new-season-available highlight).
 */
export function collectSubscribedNames(
  providersByCountry: Record<string, ProvidersByType>,
): string[] {
  const names = new Set<string>();
  for (const byType of Object.values(providersByCountry)) {
    for (const list of [
      byType.flatrate,
      byType.rent,
      byType.buy,
      byType.free,
    ]) {
      for (const provider of list) {
        if (provider.subscribed) names.add(provider.name);
      }
    }
  }

  return [...names];
}
