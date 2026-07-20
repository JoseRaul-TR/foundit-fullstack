// packages/types/src/person.ts

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
