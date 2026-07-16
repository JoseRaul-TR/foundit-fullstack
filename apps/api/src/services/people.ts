// apps/api/src/services/people.ts

import { parseYear } from "@/helpers/tmdbMedia";
import { fetchTmdbWithFallback } from "@/lib/tmdb";
import type {
  TmdbPerson,
  TmdbPersonMovieCredit,
  TmdbPersonSeriesCredit,
} from "@/types/tmdb.types";
import type { SupportedLocale } from "@foundit/types";

const PERSON_APPEND_TO_RESPONSE = "movie_credits,tv_credits,images";
const MAX_PHOTOS = 10;

export interface PersonPhoto {
  filePath: string;
}
export interface PersonMovieCastCredit {
  id: number;
  title: string;
  character: string;
  posterPath: string | null;
  year: number | null;
}

export interface PersonMovieCrewCredit {
  id: number;
  title: string;
  job: string;
  posterPath: string | null;
  year: number | null;
}

export interface PersonSeriesCastCredit {
  id: number;
  name: string;
  character: string;
  posterPath: string | null;
  firstAirYear: number | null;
}

export interface PersonSeriesCrewCredit {
  id: number;
  name: string;
  job: string;
  posterPath: string | null;
  firstAirYear: number | null;
}

export interface PersonDetailResponse {
  id: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  photos: PersonPhoto[];
  movieCredits: {
    cast: PersonMovieCastCredit[];
    crew: PersonMovieCrewCredit[];
  };
  seriesCredits: {
    cast: PersonSeriesCastCredit[];
    crew: PersonSeriesCrewCredit[];
  };
}

/** Descending date-string comparator; missing/empty dates sort last. */
function compareDateDesc(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? 1 : a > b ? -1 : 0;
}

export async function getPersonDetail(
  tmdbId: number,
  locale: SupportedLocale,
): Promise<PersonDetailResponse> {
  const person = await fetchTmdbWithFallback<TmdbPerson>(
    `/person/${tmdbId}`,
    { append_to_response: PERSON_APPEND_TO_RESPONSE },
    locale,
  );

  const photos: PersonPhoto[] = (person.images?.profiles ?? [])
    .slice(0, MAX_PHOTOS)
    .map((image) => ({ filePath: image.file_path }));

  const movieCast: TmdbPersonMovieCredit[] = [
    ...(person.movie_credits?.cast ?? []),
  ].sort((a, b) => compareDateDesc(a.release_date, b.release_date));
  const movieCrew: TmdbPersonMovieCredit[] = [
    ...(person.movie_credits?.crew ?? []),
  ].sort((a, b) => compareDateDesc(a.release_date, b.release_date));
  const seriesCast: TmdbPersonSeriesCredit[] = [
    ...(person.tv_credits?.cast ?? []),
  ].sort((a, b) => compareDateDesc(a.first_air_date, b.first_air_date));
  const seriesCrew: TmdbPersonSeriesCredit[] = [
    ...(person.tv_credits?.crew ?? []),
  ].sort((a, b) => compareDateDesc(a.first_air_date, b.first_air_date));

  return {
    id: person.id,
    name: person.name,
    // TMDB returns "" (not missing) for people without a written biography.
    biography: person.biography || null,
    birthday: person.birthday,
    placeOfBirth: person.place_of_birth,
    profilePath: person.profile_path,
    photos,
    movieCredits: {
      cast: movieCast.map((c) => ({
        id: c.id,
        title: c.title,
        character: c.character ?? "",
        posterPath: c.poster_path,
        year: parseYear(c.release_date),
      })),
      crew: movieCrew.map((c) => ({
        id: c.id,
        title: c.title,
        job: c.job ?? "",
        posterPath: c.poster_path,
        year: parseYear(c.release_date),
      })),
    },
    seriesCredits: {
      cast: seriesCast.map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character ?? "",
        posterPath: c.poster_path,
        firstAirYear: parseYear(c.first_air_date),
      })),
      crew: seriesCrew.map((c) => ({
        id: c.id,
        name: c.name,
        job: c.job ?? "",
        posterPath: c.poster_path,
        firstAirYear: parseYear(c.first_air_date),
      })),
    },
  };
}
