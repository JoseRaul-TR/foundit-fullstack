// apps/web/vitest.config.ts
//
// Separate from apps/api's config on purpose (#200): the two share almost
// nothing — `node` against `nuxt`, one needs a database — and `pnpm -r test`
// already runs both. A root config with `projects` would have to replicate
// apps/api's db:test:migrate step and would buy nothing.
//
// `defineVitestConfig` rather than Vitest's own `defineConfig`: it is what
// wires the `nuxt` environment, which is the whole reason for this setup.
// Components here rely on auto-imports — useI18n, useAuthStore, useMediaState
// — and mounting them outside a Nuxt context would mean hand-mocking every
// one of them in every file.
import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    globals: true,
    environment: "nuxt",
    setupFiles: ["./tests/setup.ts"],
    // Booting a Nuxt context per file is slower than apps/api's plain node
    // environment. 15s matches what apps/api settled on for its own reasons.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
