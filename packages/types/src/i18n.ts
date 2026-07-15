// packages/types/src/i18n.ts
export type SupportedLocale = "en" | "es" | "sv";

export const LOCALE_TO_TMDB_LANG: Record<SupportedLocale, string> = {
  en: "en-US",
  es: "es-ES",
  sv: "sv-SE",
};

export const SUPPORTED_LOCALES = Object.keys(
  LOCALE_TO_TMDB_LANG,
) as SupportedLocale[];

export function isLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as string[]).includes(value);
}
