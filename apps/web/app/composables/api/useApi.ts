// apps/web/app/composables/api/useApi.ts
//
// Thin typed wrapper around Nuxt's $fetch for every apps/api call.
// - Prefixes requests with runtimeConfig.public.apiBase.
// - Sends our own SupportedLocale ("en"/"es"/"sv") as `lang` — NOT
//   useLocale().tmdbLanguage ("en-US"). apps/api's own Zod schemas
//   expect SupportedLocale and map to a TMDB language code internally
//   (see apps/api/src/services/search.ts); sending "en-US" here would
//   fail validation on every request.
// - Sends credentials so Better Auth's session cookie travels on the
//   cross-origin requests of local development (web:3000 -> api:3001).
//   In production both are served from a single origin, where this is
//   simply the default behaviour anyway.
// - On 401, clears the local session and redirects to /login, preserving the
//   current path as ?redirect= — matching the Login page's existing "Sign in
//   to continue" RedirectBanner.

import { useQueryClient } from "@tanstack/vue-query";

// Derived directly from Nuxt's own $fetch instead of importing ofetch's
// FetchOptions — ofetch types `method` as a loose `string`, which Nitro's
// stricter method-literal union rejects when passed back into $fetch.
type ApiFetchOptions = Parameters<typeof $fetch>[1];

export function useApi() {
  const apiBase = useApiBase();
  const { locale } = useLocale();
  const route = useRoute();
  const localePath = useLocalePath();
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  async function apiFetch<T>(
    path: string,
    options: ApiFetchOptions = {},
  ): Promise<T> {
    try {
      return await $fetch<T>(path, {
        baseURL: apiBase,
        credentials: "include",
        ...options,
        query: {
          lang: locale.value,
          ...options.query,
        },
      });
    } catch (error) {
      if (isUnauthorized(error)) {
        // The server says the session is gone, so the client's copy has to go
        // with it. Without this the login page's "already signed in" guard
        // reads a stale authenticated store and sends the user straight back,
        // undoing the navigation before it's ever visible -- which is exactly
        // what made this look like the redirect wasn't happening at all.
        authStore.clearUser();
        queryClient.clear();

        await navigateTo({
          path: localePath("/login"),
          query: { redirect: route.fullPath },
        });
      }

      throw error;
    }
  }

  return { apiFetch };
}

/**
 * A 401 is not a failure the caller needs to report: apiFetch has already
 * cleared the local session and sent the user to the login page. Mutations
 * still need the rejection so their optimistic updates roll back, but a
 * "something went wrong" on top of that is misleading -- nothing went wrong,
 * the session simply ended.
 *
 * The single place in the app that knows how ofetch reports a status code.
 */
export function isUnauthorized(error: unknown): boolean {
  return (
    (error as { response?: { status?: number } })?.response?.status === 401
  );
}
