// apps/web/app/plugins/vue-query.ts

import {
  hydrate,
  dehydrate,
  QueryClient,
  VueQueryPlugin,
  type DehydratedState,
} from "@tanstack/vue-query";

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 10 * 60 * 1000, // 10 min
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });

  if (import.meta.server) {
    // Capture the dehydrated state as late as possible — on "app:rendered",
    // right before the payload is serialized — so it includes queries
    // fired during page setup. Dehydrating at plugin-init time (before
    // any page component has run) would always capture an empty cache.
    nuxtApp.hooks.hook("app:rendered", () => {
      nuxtApp.payload.vueQueryState = dehydrate(queryClient);
    });
  }
  if (import.meta.client) {
    hydrate(queryClient, nuxtApp.payload.vueQueryState as DehydratedState);
  }
});
