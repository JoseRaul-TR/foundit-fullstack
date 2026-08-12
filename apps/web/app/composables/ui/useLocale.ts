// apps/web/app/composables/ui/useLocale.ts
//
// Everything about the active locale, in one place: the TMDB language code
// the API expects, and the human name of each language for the selectors.
//
// The TMDB side keeps LOCALE_TO_TMDB_LANG (from @foundit/types) as the single
// source of truth, shared with apps/api's own locale-fallback fetching.
//
// The names live here rather than inside LanguageMenu because the footer
// selector and the avatar menu both label the current language too, and three
// copies of the same list drift apart. They are written in their own language
// and deliberately not run through i18n: someone looking for Swedish scans for
// "Svenska", not for "Sueco" — translating the options would hide each one
// from exactly the person who needs it.
import { LOCALE_TO_TMDB_LANG, isLocale } from "@foundit/types";
import type { SupportedLocale } from "@foundit/types";

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
}

const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "sv", label: "Svenska" },
];

export function useLocale() {
  const { locale } = useI18n();

  const tmdbLanguage = computed(() => {
    const current = locale.value;
    return isLocale(current)
      ? LOCALE_TO_TMDB_LANG[current]
      : LOCALE_TO_TMDB_LANG.en;
  });

  function localeLabel(code: string): string {
    return (
      LOCALE_OPTIONS.find((option) => option.code === code)?.label ??
      code.toUpperCase()
    );
  }

  return {
    locale,
    tmdbLanguage,
    localeOptions: LOCALE_OPTIONS,
    localeLabel,
  };
}
