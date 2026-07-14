// apps/api/src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";
import { PrismaClient } from "@prisma/client";

// Break down the connection URL
const databaseUrl = new URL(env.DATABASE_URL);

export const pool = new Pool({
  user: databaseUrl.username,
  password: databaseUrl.password,
  host: databaseUrl.hostname,
  port: parseInt(databaseUrl.port, 10),
  database: databaseUrl.pathname.slice(1),
});

const adapter = new PrismaPg(pool);

// Singleton to avoid multiple instances of PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
