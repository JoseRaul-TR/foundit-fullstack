// apps/api/src/config/env.ts
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { z } from "zod";

// Load el .env from the monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

// Validate with Zod environment variables
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.url(),
  TMDB_API_KEY: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
  FRONTEND_URL: z.url(),
});

export const env = envSchema.parse(process.env);
