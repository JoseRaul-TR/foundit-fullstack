// apps/api/src/services/genres.ts

import { getOrSetCache, ONE_DAY_MS } from "@/lib/cache";
import { fetchTmdb } from "@/lib/tmdb";
import type { TmdbGenreListResponse } from "@/types/tmdb.types";
import { LOCALE_TO_TMDB_LANG, type SupportedLocale } from "@foundit/types";

export interface GenreItem {
  id: number;
  name: string;
}

export interface GenresResponse {
  movie: GenreItem[];
  tv: GenreItem[];
}

function dedupeById(genres: GenreItem[]): GenreItem[] {
  const seen = new Map<number, GenreItem>();
  for (const genre of genres) {
    if (!seen.has(genre.id)) {
      seen.set(genre.id, genre);
    }
  }
  return [...seen.values()];
}

export async function getGenres(
  locale: SupportedLocale,
): Promise<GenresResponse> {
  return getOrSetCache(`genres:${locale}`, ONE_DAY_MS, async () => {
    const language = LOCALE_TO_TMDB_LANG[locale];

    const [movieRes, tvRes] = await Promise.all([
      fetchTmdb<TmdbGenreListResponse>("/genre/movie/list", { language }),
      fetchTmdb<TmdbGenreListResponse>("/genre/tv/list", { language }),
    ]);

    return {
      movie: dedupeById(movieRes.genres),
      tv: dedupeById(tvRes.genres),
    };
  });
}
