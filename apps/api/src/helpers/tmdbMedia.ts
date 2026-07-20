//apps/api/src/helpers/tmdbMedia.ts
import type {
  TmdbCredits,
  TmdbMovie,
  TmdbSeries,
  TmdbVideosResponse,
  TmdbWatchProviderEntry,
  TmdbWatchProvidersCountry,
  TmdbPaginatedResponse,
  TmdbSearchResultItem,
} from "@/types/tmdb.types";
import type {
  Provider,
  ProviderType,
  NormalizedSearchResult,
  MediaType,
  ProvidersByType,
  MediaTrailer,
  NormalizedCastMember,
} from "@foundit/types";
import { fetchTmdb } from "@/lib/tmdb";

export const MAX_CAST = 10;
export const MAX_RECOMMENDATIONS = 10;

export function parseYear(
  dateString: string | undefined | null,
): number | null {
  if (!dateString) return null;
  const year = Number(dateString.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

export function extractTrailer(
  videos: TmdbVideosResponse | undefined,
): MediaTrailer | null {
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

export function collectSubscribedServices(
  providersByCountry: Record<string, ProvidersByType>,
): { name: string; logoPath: string }[] {
  const seen = new Map<string, { name: string; logoPath: string }>();
  for (const byType of Object.values(providersByCountry)) {
    for (const list of [
      byType.flatrate,
      byType.rent,
      byType.buy,
      byType.free,
    ]) {
      for (const provider of list) {
        if (provider.subscribed && !seen.has(provider.name)) {
          seen.set(provider.name, {
            name: provider.name,
            logoPath: provider.logoPath,
          });
        }
      }
    }
  }
  return [...seen.values()];
}

export function extractTitle(
  mediaType: MediaType,
  raw: TmdbMovie | TmdbSeries,
): string {
  return mediaType === "movie"
    ? (raw as TmdbMovie).title
    : (raw as TmdbSeries).name;
}

export function extractYear(
  mediaType: MediaType,
  raw: TmdbMovie | TmdbSeries,
): number | null {
  return mediaType === "movie"
    ? parseYear((raw as TmdbMovie).release_date)
    : parseYear((raw as TmdbSeries).first_air_date);
}

export async function fetchMediaRaw(
  tmdbId: number,
  mediaType: MediaType,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<TmdbMovie | TmdbSeries> {
  return mediaType === "movie"
    ? fetchTmdb<TmdbMovie>(`/movie/${tmdbId}`, params)
    : fetchTmdb<TmdbSeries>(`/tv/${tmdbId}`, params);
}

export interface BasicMediaTmdbInfo {
  title: string;
  posterPath: string | null;
  year: number | null;
}

export async function fetchBasicMediaInfo(
  tmdbId: number,
  mediaType: MediaType,
  language: string,
): Promise<BasicMediaTmdbInfo> {
  const raw = await fetchMediaRaw(tmdbId, mediaType, { language });
  return {
    title: extractTitle(mediaType, raw),
    posterPath: raw.poster_path,
    year: extractYear(mediaType, raw),
  };
}
