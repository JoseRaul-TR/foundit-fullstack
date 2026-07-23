// apps/web/app/composables/useAppMeta.ts
//
// Minimal composable proving runtimeConfig.public resolves inside
// composables (not just pages) — the #56 acceptance criterion. The
// @foundit/types-in-a-composable half of that criterion is now covered
// by useLocale() (#57), which is also the composable pages should
// actually use for locale/TMDB-language logic. Kept this one deliberately
// thin rather than duplicating that logic here.
export function useAppMeta() {
  const config = useRuntimeConfig();

  return {
    appName: config.public.appName,
    apiBase: config.public.apiBase,
  };
}
