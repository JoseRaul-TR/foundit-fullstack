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
  // Neon's compute starts in 375–546 ms and a cold connection that works
  // completes in ~835 ms (measured 24 Aug, #238). One did not: it sat for 12.8 s
  // before reporting ETIMEDOUT, and because /history awaits its prefetch during
  // SSR, that was 12.8 s of blank page before the skeleton appeared.
  //
  // pg defaults this to 0 — wait forever — so nothing bounded it. 3 s is three
  // and a half times the measured cold connect: a healthy wake is never
  // interrupted, and the pathological case fails fast enough for the client to
  // render its skeleton and refetch.
  //
  // Why that one connection hung when the wake was half a second is unexplained.
  // This bounds it; it does not fix it.
  connectionTimeoutMillis: 3_000,
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
