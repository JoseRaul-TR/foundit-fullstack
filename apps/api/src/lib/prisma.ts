// apps/api/src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/config/env";
import { PrismaClient } from "@prisma/client";

// Let pg parse the connection string itself instead of decomposing it by
// hand: manual decomposition silently dropped every query parameter
// (notably `sslmode=require`, which managed providers like Neon enforce),
// and produced NaN for the port on URLs that omit it.
const databaseUrl = new URL(env.DATABASE_URL);
const requiresTls = databaseUrl.searchParams.get("sslmode") !== null;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Local Postgres (docker-compose) serves plain TCP with no certificate, so
  // TLS is enabled only when the URL explicitly asks for it. Certificates are
  // verified against the system CA bundle — the Dockerfile installs
  // ca-certificates for exactly this.
  ssl: requiresTls ? { rejectUnauthorized: true } : false,
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
