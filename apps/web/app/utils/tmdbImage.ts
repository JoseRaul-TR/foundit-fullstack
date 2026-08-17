// apps/web/app/utils/tmdbImage.ts
//
// TMDB doesn't resize on demand: it serves a fixed set of widths and 404s on
// anything else. So "ask for the right size" means picking from this list.
//
// One list, not one per image kind. TMDB documents poster_sizes,
// backdrop_sizes and profile_sizes separately, but the path namespace is flat
// — /t/p/{size}{path} carries no notion of what the image is — so a width
// listed for one kind works for another. This app has always fetched person
// portraits at w500, which is not in profile_sizes, and it has always worked.
// The tuple exists to catch typos, not to enforce a partition TMDB doesn't.
//
// Reference: https://developer.themoviedb.org/docs/image-basics

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export const TMDB_WIDTHS = [
  45, 92, 154, 185, 300, 342, 500, 780, 1280,
] as const;
export type TmdbWidth = (typeof TMDB_WIDTHS)[number];

/** A single URL. Use for the `src` fallback and wherever one size is enough. */
export function tmdbImage(
  path: string | null | undefined,
  width: TmdbWidth,
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/w${width}${path}` : null;
}

/**
 * A `srcset` with `w` descriptors, so the browser resolves viewport and device
 * pixel ratio itself. It can only do that if `sizes` describes the layout
 * honestly — a wrong `sizes` produces a wrong choice with no warning.
 */
export function tmdbImageSrcset(
  path: string | null | undefined,
  widths: readonly TmdbWidth[],
): string | undefined {
  if (!path) return undefined;
  return widths.map((w) => `${TMDB_IMAGE_BASE}/w${w}${path} ${w}w`).join(", ");
}
