// packages/types/src/i18n.ts
export type SupportedLocale = "en" | "es" | "sv";

export const LOCALE_TO_TMDB_LANG: Record<SupportedLocale, string> = {
  en: "en-US",
  es: "es-ES",
  sv: "sv-SE",
};
