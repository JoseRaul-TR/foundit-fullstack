// packages/types/src/history.ts

/**
 * The filter, not the media type. `all` is the default, and it is why
 * GET /api/v1/history stopped taking `type` as a required discriminator in
 * #234: the two response shapes were incompatible, so the endpoint made the
 * caller choose — and the client answered by fetching both sequences in full
 * and merging them in the browser, which is what made the page unpaginable.
 *
 * Same vocabulary as WatchlistTypeFilter on purpose: the two pages offer the
 * same control and should not need different words for it.
 */
export type HistoryTypeFilter = "all" | "movie" | "series";

interface HistoryItemBase {
  tmdbId: number;
  /**
   * The last time this entry was watched: for a movie its single row's
   * createdAt, bumped on re-watch; for a show the newest of its season rows.
   *
   * One name for both, and `lastWatchedAt` rather than `watchedAt`, because
   * it is the list's sort key — and a sort key that changes name by branch is
   * a sort key the caller cannot order by without knowing which branch it is
   * looking at.
   */
  lastWatchedAt: Date;
  rating: number | null;
}

export interface HistoryMovieItemResponse extends HistoryItemBase {
  mediaType: "movie";
  tmdb: {
    title: string;
    posterPath: string | null;
    year: number | null;
  };
}

export interface HistorySeriesItemResponse extends HistoryItemBase {
  mediaType: "series";
  tmdb: {
    title: string;
    posterPath: string | null;
    /**
     * Series carry a year now. They did not before: the client set it to null
     * while enriching, so the same show displayed its year on the watchlist
     * and nothing on the history. It costs no extra call — `extractYear`
     * reads `first_air_date` off the object already being fetched.
     */
    year: number | null;
    numberOfSeasons: number;
  };
  /** Ascending. Season 0 is TMDB's specials bucket and is kept as reported. */
  watchedSeasons: number[];
}

/**
 * Discriminated on `mediaType` rather than carrying optional fields, because
 * one endpoint now returns both and every caller has to branch anyway.
 * Narrowing on the discriminant then hands over `watchedSeasons` without a
 * check that can be forgotten.
 *
 * `WatchlistItemResponse` still draws the same distinction with optional
 * fields (`watched?` / `newSeasonsAvailable?`) even though `buildResponse`
 * already returns one shape or the other. That predates this and is outside
 * #234; worth aligning whenever something else touches that file.
 */
export type HistoryItemResponse =
  HistoryMovieItemResponse | HistorySeriesItemResponse;
