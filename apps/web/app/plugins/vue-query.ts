// apps/web/app/plugins/vue-query.ts

import {
  hydrate,
  dehydrate,
  QueryClient,
  VueQueryPlugin,
} from "@tanstack/vue-query";

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 min
        gcTime: 10 * 60 * 1000, // 10 min
        // retry: 1 on the client is right — the retry happens under a skeleton
        // that is already on screen, so it costs nothing visible.
        //
        // On the server it costs the whole TTFB. prefetchQuery inherits these
        // defaults, so each prefetch made two attempts, and with ofetch's own
        // retry inside, four requests to the API. Against a cold database that
        // is four chained 3 s timeouts in front of the first byte (#238). A
        // failed prefetch should give up: the client refetches it anyway,
        // under the skeleton.
        retry: import.meta.server ? false : 1,
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
    hydrate(queryClient, nuxtApp.payload.vueQueryState);
  }
});
