// apps/api/src/helpers/tmdbMedia.ts
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
  NormalizedCrewMember,
} from "@foundit/types";
import { fetchTmdb } from "@/lib/tmdb";

export const MAX_RECOMMENDATIONS = 20;

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

/**
 * No cap. TMDB orders cast by billing, so a cut here removed the small parts
 * and left the leads — defensible — but a person is about 100 bytes of JSON,
 * so two hundred of them are 20 KB, a fraction of one poster. The client
 * decides how many to draw; the payload is not where that decision belongs.
 */
export function extractCast(
  credits: TmdbCredits | undefined,
): NormalizedCastMember[] {
  return (credits?.cast ?? [])
    .filter((member) => !member.adult)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profilePath: member.profile_path,
    }));
}

/**
 * TMDB returns crew grouped by department and id, with no notion of
 * importance. This list supplies the missing one. It no longer decides who
 * survives a cut — there isn't one — but it still decides two things: the
 * order people appear in, and which of a person's jobs leads their card.
 */
const CREW_JOB_PRIORITY: readonly string[] = [
  "Director",
  "Screenplay",
  "Writer",
  "Story",
  "Producer",
  "Executive Producer",
  "Director of Photography",
  "Original Music Composer",
  "Editor",
  "Production Design",
  "Costume Design",
];

function crewRank(job: string): number {
  const index = CREW_JOB_PRIORITY.indexOf(job);
  return index === -1 ? CREW_JOB_PRIORITY.length : index;
}

interface CrewAccumulator {
  id: number;
  name: string;
  profilePath: string | null;
  jobs: string[];
}

/**
 * One entry per person, not per credit. TMDB sends a separate crew object for
 * every job, so Nolan arrived three times on Inception — invisible under a cap
 * of fifteen, three identical cards in a row without one.
 *
 * A person's own jobs are ordered by weight so their card leads with the one
 * they're known for here, and people are ordered by their best job. The Map
 * preserves TMDB's order and both sorts are stable, so anyone sharing a rank
 * stays where TMDB put them.
 */
export function extractCrew(
  credits: TmdbCredits | undefined,
): NormalizedCrewMember[] {
  const byPerson = new Map<number, CrewAccumulator>();

  for (const member of credits?.crew ?? []) {
    if (member.adult) continue;
    const existing = byPerson.get(member.id);
    if (existing) {
      if (!existing.jobs.includes(member.job)) existing.jobs.push(member.job);
    } else {
      byPerson.set(member.id, {
        id: member.id,
        name: member.name,
        profilePath: member.profile_path,
        jobs: [member.job],
      });
    }
  }

  return [...byPerson.values()]
    .map((person) => ({
      person,
      // Math.min over the jobs rather than reading the first one after
      // sorting: same answer, no indexing, no assertion to argue with.
      bestRank: Math.min(...person.jobs.map(crewRank)),
    }))
    .sort((a, b) => a.bestRank - b.bestRank)
    .map(({ person }) => ({
      id: person.id,
      name: person.name,
      jobs: [...person.jobs].sort((a, b) => crewRank(a) - crewRank(b)),
      profilePath: person.profilePath,
    }));
}

/**
 * Read from the full credits list on purpose, not from extractCrew's output.
 * A line that names the director must not depend on whether the director
 * happened to survive a cap — that dependency is exactly what made the crew
 * section unreliable in the first place.
 */
export function extractDirectors(credits: TmdbCredits | undefined): string[] {
  const names = new Set<string>();
  for (const member of credits?.crew ?? []) {
    if (member.job === "Director") names.add(member.name);
  }
  return [...names];
}

// NOTE: no longer slices to MAX_RECOMMENDATIONS unconditionally — discover.ts's
// multi-region buffers need the FULL page (20 items), not a top-10 cut, since
// it's the one doing its own merge/slice afterward. Recommendations callers
// (movies.ts/series.ts) still want the capped behavior, so slicing moved to
// an explicit `limit` param defaulting to MAX_RECOMMENDATIONS.
export function extractRecommendations(
  recommendations: TmdbPaginatedResponse<TmdbSearchResultItem> | undefined,
  mediaType: MediaType,
  limit: number = MAX_RECOMMENDATIONS,
): NormalizedSearchResult[] {
  return (recommendations?.results ?? [])
    .filter((item) => !item.adult)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      mediaType,
      title: item.title ?? item.name ?? "",
      posterPath: item.poster_path,
      year: parseYear(item.release_date ?? item.first_air_date),
      tmdbRating: item.vote_average ?? null,
      genreIds: item.genre_ids ?? [],
      popularity: item.popularity ?? null,
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
      ads: (byType.ads ?? []).map((p) =>
        toProvider(p, "ads", countryCode, subscribedSet),
      ),
      link: byType.link || null,
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
      byType.ads,
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
      byType.ads,
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

import type { SupportedLocale } from "@foundit/types";
import type {
  TmdbMovieReleaseDatesResponse,
  TmdbContentRatingsResponse,
} from "@/types/tmdb.types";

const LOCALE_TO_CERT_COUNTRY: Record<SupportedLocale, string> = {
  en: "US",
  es: "ES",
  sv: "SE",
};

export function extractMovieAgeRating(
  releaseDates: TmdbMovieReleaseDatesResponse | undefined,
  locale: SupportedLocale,
): string | null {
  if (!releaseDates?.results?.length) return null;
  const targetCountry = LOCALE_TO_CERT_COUNTRY[locale] ?? "US";
  const preferred = releaseDates.results.find(
    (r) => r.iso_3166_1 === targetCountry,
  );
  const fallback = releaseDates.results.find((r) => r.iso_3166_1 === "US");
  const entry = preferred ?? fallback ?? releaseDates.results[0];
  const withCert = entry?.release_dates.find((d) => d.certification);
  return withCert?.certification || null;
}

export function extractSeriesAgeRating(
  contentRatings: TmdbContentRatingsResponse | undefined,
  locale: SupportedLocale,
): string | null {
  if (!contentRatings?.results?.length) return null;
  const targetCountry = LOCALE_TO_CERT_COUNTRY[locale] ?? "US";
  const preferred = contentRatings.results.find(
    (r) => r.iso_3166_1 === targetCountry,
  );
  const fallback = contentRatings.results.find((r) => r.iso_3166_1 === "US");
  const entry = preferred ?? fallback ?? contentRatings.results[0];
  return entry?.rating || null;
}

// Same idea as extractSeriesAgeRating, but keyed by an arbitrary raw
// country code (not one of our 3 locales) — used by discover.ts's bounded
// per-item post-filter, where the country comes from the user's own
// ageRatingCountry setting, not from the active UI locale.
export function extractSeriesCertificationForCountry(
  contentRatings: TmdbContentRatingsResponse | undefined,
  countryCode: string,
): string | null {
  const entry = contentRatings?.results?.find(
    (r) => r.iso_3166_1 === countryCode,
  );
  return entry?.rating || null;
}

export interface AiredSeasons {
  /** How many seasons have aired. Replaces `number_of_seasons` wherever the
   *  question is "how much is there to watch". */
  count: number;
  /** The highest season number that has aired. Replaces `number_of_seasons`
   *  wherever the question is "is there something newer than what I finished". */
  latestNumber: number;
}

/**
 * The seasons a viewer could actually have watched, in the two shapes the
 * application asks for.
 *
 * `number_of_seasons` counts the seasons TMDB knows about, and TMDB knows
 * about a season the moment it is announced. Every place that used it to
 * answer a question about watching inherited that: the badge announced
 * seasons nobody could see (#300), a series with an announced season could
 * never read as up to date, and the "hide what I've watched" filter never
 * considered one finished.
 *
 * Both values come from one pass on purpose. For an ordinary series they are
 * equal, because TMDB numbers seasons 1..N — but nothing guarantees that, and
 * they answer different questions. Deriving one from the other is how they
 * would drift.
 *
 * Season 0 is TMDB's specials bucket and `number_of_seasons` excludes it.
 * This excludes it too, so the two stay comparable and every caller that was
 * already reasoning about that exclusion keeps being right.
 *
 * A missing air date counts as not aired. TMDB leaves it empty for a season
 * announced without a date, which is the case this exists to catch; it can
 * also mean TMDB does not know about a season that did air. The two mistakes
 * are not the same size: staying quiet about a watchable season costs the
 * user a notification, while announcing one that does not exist breaks the
 * single promise the application makes.
 *
 * Dates are compared as ISO strings, not as `Date` objects. Both sides are
 * `YYYY-MM-DD`, lexicographic order is chronological order, and nothing
 * crosses a timezone on the way.
 */
export function airedSeasons(series: TmdbSeries): AiredSeasons {
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  let latestNumber = 0;

  for (const season of series.seasons ?? []) {
    if (season.season_number === 0) continue;
    if (!season.air_date || season.air_date > today) continue;

    count += 1;
    if (season.season_number > latestNumber) {
      latestNumber = season.season_number;
    }
  }

  return { count, latestNumber };
}
