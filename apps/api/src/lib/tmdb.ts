// apps/api/src/lib/tmdb.ts
import { LOCALE_TO_TMDB_LANG, type SupportedLocale } from "@foundit/types";
import { env } from "src/config/env";
import { AppError } from "src/middleware/errorHandler";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TIMEOUT_MS = 10_000;

type TmdbRequestParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params: TmdbRequestParams): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${TMDB_BASE_URL}${normalizedPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Calls a TMDB endpoint and returns the JSON typed as T.
 * - Never exposes the API key: it's only in the Authorization header, never in the URL or in errors.
 * - 10s timeout -> AppError 503 (same as any other network failure).
 * - Non-2xx response -> AppError with the most appropriate status, without forwarding the TMDB body as is.
 */
export async function fetchTmdb<T>(
  path: string,
  params: TmdbRequestParams = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.TMDB_API_KEY}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch {
    // fetch failed (DNS, conexion rejected) or abort because of timeout -> both treated as 503
    throw new AppError("TMDB API is unreacheable", 503);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new AppError("Resource not found on TMDB", 404);
    }
    // 401 (invalid API key), 429 (rate limit), TMDB 5xx, etc. -> 502 Bad Gateway
    // because it's a mistake on our end communicating with an upstream server, not the client who called us.
    throw new AppError(
      `TMDB request failed with status ${response.status}`,
      502,
    );
  }

  return (await response.json()) as T;
}

// Text fields that may be empty in one language and need to fall back to en-US.
interface TmdbTextFields {
  overview?: string | null;
  biography?: string | null;
}

function isEmptyText(value: string | null | undefined): boolean {
  return value === undefined || value === null || value.trim().length === 0;
}

/**
 * Same as fetchTmdb, but with language fallback:
 *   1. Requests the resource in the requested language (`locale`).
 *   2. If `overview`/`biography` is empty, requests it again in en-US.
 *   3. Combines: keeps the translated title/name if TMDB returned it, and only populates the empty text fields with English.
 *
 * If `locale` is already "en", it doesn't make a second call (there's no fallback to apply).
 */
export async function fetchTmdbWithFallback<T extends TmdbTextFields>(
  path: string,
  params: TmdbRequestParams,
  locale: SupportedLocale,
): Promise<T> {
  const primaryLang = LOCALE_TO_TMDB_LANG[locale];
  const primary = await fetchTmdb<T>(path, {
    ...params,
    language: primaryLang,
  });

  const needsFallback =
    isEmptyText(primary.overview) || isEmptyText(primary.biography);

  if (!needsFallback || primaryLang === LOCALE_TO_TMDB_LANG.en) {
    return primary;
  }

  const fallback = await fetchTmdb<T>(path, {
    ...params,
    language: LOCALE_TO_TMDB_LANG.en,
  });

  const merged: T = {
    ...fallback, // safe base in english
    ...primary, // overwrites with what is translated (title, name, ...)
  };

  if ("overview" in merged) {
    merged.overview = isEmptyText(primary.overview)
      ? fallback.overview
      : primary.overview;
  }
  if ("biography" in merged) {
    merged.biography = isEmptyText(primary.biography)
      ? fallback.biography
      : primary.biography;
  }

  return merged;
}
