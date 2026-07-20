// apps/api/tests/setup.ts
//
// Vitest setupFiles entry — runs before any test file imports app code.
// Loads .env.test with override:true so it wins over config/env.ts's own
// (non-destructive) dotenv.config() call to the monorepo root .env, meaning
// the whole test run points at the foundit_test database and dummy TMDB/
// Google credentials. TMDB is never actually called — every suite mocks
// @/lib/tmdb (see tests/fixtures/tmdb.ts).
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env.test"),
  override: true,
});
