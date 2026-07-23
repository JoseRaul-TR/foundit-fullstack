// apps/web/nuxt.config.ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/i18n", "@pinia/nuxt"],
  vite: {
    optimizeDeps: {
      include: ["@tanstack/vue-query"],
    },
  },
  tailwindcss: {
    cssPath: "~/assets/css/main.css",
  },
  i18n: {
    strategy: "prefix_except_default",
    defaultLocale: "en",
    locales: [
      { code: "en", file: "en.json" },
      { code: "es", file: "es.json" },
      { code: "sv", file: "sv.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
      alwaysRedirect: false,
      fallbackLocale: "en",
    },
  },
  runtimeConfig: {
    // No server-only keys yet — the API base is public because the
    // browser calls it directly, nothing secret involved.
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3001",
      appName: process.env.NUXT_PUBLIC_APP_NAME || "FoundIt",
    },
  },
  app: {
    head: {
      title: "FoundIt",
      titleTemplate: "%s – FoundIt",
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      meta: [
        {
          name: "description",
          content:
            "Discover where to watch your favorite movies and series across streaming services.",
        },
      ],
    },
  },

  // Merges the monorepo's shared strict TS config into Nuxt's own
  // generated tsconfig files (.nuxt/tsconfig.*.json) via nuxt.config,
  // rather than hand-editing tsconfig.json — Nuxt regenerates that file
  // on every `nuxt prepare`/`nuxt dev`, so direct edits there wouldn't
  // survive.
  typescript: {
    strict: true,
    tsConfig: {
      extends: "../../../tsconfig.base.json",
    },
  },
});
