// apps/web/app/composables/useAppMeta.ts// apps/web/app/composables/useAppMeta.ts

/**
 * Minimun composable to fulfill aceptance criteria for #56:
 * proves that @foundit/types resolves inside composables (not only in pages), and that runtimeConfig.public is readable from one.
 * It will be functionally achived when #58 (useApi) and #59 (Pinia stores) will be implemented – deliberately minimal for now.
 */
import { LOCALE_TO_TMDB_LANG, type SupportedLocale } from "@foundit/types";

export function useAppMeta() {
  const config = useRuntimeConfig();

  function tmdbLanguageFor(locale: SupportedLocale): string {
    return LOCALE_TO_TMDB_LANG[locale];
  }

  return {
    appName: config.public.appName,
    apiBase: config.public.apiBase,
    tmdbLanguageFor,
  };
}
