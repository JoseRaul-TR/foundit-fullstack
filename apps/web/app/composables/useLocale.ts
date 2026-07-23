// apps/web/app/composables/useLocale.ts
//
// Bridges Nuxt i18n's active locale to the TMDB language code the API
// expects. Keeps LOCALE_TO_TMDB_LANG (from @foundit/types) as the single
// source of truth, shared with apps/api's own locale-fallback fetching.
import { LOCALE_TO_TMDB_LANG, isLocale } from "@foundit/types";

export function useLocale() {
  const { locale } = useI18n();

const tmdbLanguage = computed(() => {
    const current = locale.value;
    return isLocale(current)
      ? LOCALE_TO_TMDB_LANG[current]
      : LOCALE_TO_TMDB_LANG.en;
  });

  return {
    locale,
    tmdbLanguage,
  };
}
