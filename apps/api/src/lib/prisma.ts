// apps/api/src/lib/prisma.ts
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the monorepo root
// src/lib/prisma.ts → apps/api → foundit-fullstack → .env
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const databaseUrl = new URL(process.env.DATABASE_URL);

const pool = new Pool({
  user: databaseUrl.username,
  password: databaseUrl.password,
  host: databaseUrl.hostname,
  port: parseInt(databaseUrl.port, 10),
  database: databaseUrl.pathname.slice(1),
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
