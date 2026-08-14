// apps/web/app/composables/ui/useCountryName.ts

// Country names are derived from their ISO 3166-1 code, not taken from the API.
//
// TMDB's /watch/providers/regions returns english_name and native_name, neither
// of which is the interface language. Asking it for a translation would mean a
// cache entry per locale on the server and a refetch every time the user
// switches language — the problem the genre catalogue had until #145.
//
// Country names are standardised, so Intl.DisplayNames knows them exactly and
// offline. Same principle as the flag emoji, which is already derived from the
// code rather than shipped alongside it.
export function useCountryName() {
  const { locale } = useLocale();

  const displayNames = computed(
    () => new Intl.DisplayNames([locale.value], { type: "region" }),
  );

  // Sorting has to happen after translating, and with a collator: "Germany",
  // "Alemania" and "Tyskland" land in three different places, and Swedish puts
  // å, ä and ö after z — which a plain sort() gets wrong.
  const collator = computed(() => new Intl.Collator(locale.value));

  function countryName(code: string, fallback?: string): string {
    return displayNames.value.of(code) ?? fallback ?? code;
  }

  function sortByCountryName<T>(items: T[], getCode: (item: T) => string): T[] {
    return [...items].sort((a, b) =>
      collator.value.compare(countryName(getCode(a)), countryName(getCode(b))),
    );
  }

  return { countryName, sortByCountryName };
}
