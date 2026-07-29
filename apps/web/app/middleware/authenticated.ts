// apps/web/app/middleware/authenticated.ts
//
// Named middleware (not global) — applied via definePageMeta({ middleware:
// "authenticated" }) on whichever pages need it (profile, later
// watchlist/history). Relies on authStore already being populated by
// plugins/auth.ts, which Nuxt awaits fully before any route middleware
// runs, on both SSR and client navigation.
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();
  if (authStore.isAuthenticated) return;

  const localePath = useLocalePath();
  return navigateTo({
    path: localePath("/login"),
    query: { redirect: to.fullPath },
  });
});
