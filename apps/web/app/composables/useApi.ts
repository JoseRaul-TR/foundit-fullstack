// apps/web/app/composables/useApi.ts
//
// Thin typed wrapper around Nuxt's $fetch for every apps/api call.
// - Prefixes requests with runtimeConfig.public.apiBase.
// - Sends our own SupportedLocale ("en"/"es"/"sv") as `lang` — NOT
//   useLocale().tmdbLanguage ("en-US"). apps/api's own Zod schemas
//   expect SupportedLocale and map to a TMDB language code internally
//   (see apps/api/src/services/search.ts); sending "en-US" here would
//   fail validation on every request.
// - Sends credentials so Better Auth's session cookie travels on every
//   cross-origin request (web:3000 -> api:3001) — required because
//   apps/api's CORS is configured with credentials:true and a fixed
//   FRONTEND_URL origin, not a wildcard.
// - On 401, redirects to /login preserving the current path as
//   ?redirect=, matching the Login page's existing "Sign in to
//   continue" RedirectBanner.

// Derived directly from Nuxt's own $fetch instead of importing ofetch's
// FetchOptions — ofetch types `method` as a loose `string`, which Nitro's
// stricter method-literal union rejects when passed back into $fetch.
type ApiFetchOptions = Parameters<typeof $fetch>[1];

export function useApi() {
  const { public: publicConfig } = useRuntimeConfig();
  const { locale } = useLocale();
  const route = useRoute();

  async function apiFetch<T>(
    path: string,
    options: ApiFetchOptions = {},
  ): Promise<T> {
    try {
      return await $fetch<T>(path, {
        baseURL: publicConfig.apiBase,
        credentials: "include",
        ...options,
        query: {
          lang: locale.value,
          ...options.query,
        },
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;

      if (status === 401) {
        await navigateTo({
          path: "/login",
          query: { redirect: route.fullPath },
        });
      }

      throw error;
    }
  }

  return { apiFetch };
}
