// apps/api/vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // All suites share the same Postgres test DB, and resetDatabase() wipes
    // it globally — running files in parallel would race each other's data.
    // Fine at this scale (4 suites); revisit with per-worker schemas/DBs if
    // the suite grows much larger.
    fileParallelism: false,
  },
});
