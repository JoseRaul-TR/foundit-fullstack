// apps/api/src/config/env.ts
import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

/**
 * Load el .env from the monorepo root
 *
 * Resolved from process.cwd() (always the package dir when run via pnpm
 * scripts) rather than __dirname: __dirname's depth differs between the TS
 * source (src/config/) and the bundled output (dist/), which silently broke
 * .env loading in the production build.
 *
 * In production (Docker/Render) there is no .env file at all — env vars are
 * injected straight into process.env, and dotenv no-ops on a missing path.
 * */
dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
  quiet: true,
});

// Validate with Zod environment variables
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.url(),
  TMDB_API_KEY: z.string().min(1),
  // Local-dev-only HTTPS support — see the USE_HTTPS comment in app.ts.
  // Never set to true in production: Render terminates TLS at its edge.
  USE_HTTPS: z.coerce.boolean().default(false),
  HTTPS_KEY_PATH: z.string().optional(),
  HTTPS_CERT_PATH: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
  FRONTEND_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
