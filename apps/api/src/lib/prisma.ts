// apps/api/src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/config/env";
import { PrismaClient } from "@prisma/client";

// TLS is decided by the connection string, and only by it.
//
// pg parses `connectionString` and merges the result OVER any options passed
// beside it. Until #277 this file also set `ssl: { rejectUnauthorized: true }`
// whenever the URL carried an `sslmode` — which in production is always — and
// that option was replaced by the parsed value every time. It never did
// anything. Removed so there is one place to read instead of two that happened
// to agree.
//
// The URL is handed to pg whole rather than decomposed: an earlier manual
// decomposition dropped every query parameter, `sslmode` included, and
// produced NaN for the port on URLs that omit it.
//
// Production: `sslmode=verify-full`. TLS, the chain verified against Node's
// own bundled CA store — not the operating system's; the Dockerfile starts
// node with no CA flags — and the hostname checked against the certificate.
// Measured on 26 Sep 2026: `authorized: true`, issuer Let's Encrypt.
//
// Spelled out because `require`, which the URL carried until #277, means
// verify-full only until pg v9. There it takes libpq's meaning — encrypt,
// verify nothing — and the upgrade would have downgraded this connection with
// no error, no failing test and no log line.
//
// Local: the docker-compose Postgres serves plain TCP and its URL carries no
// sslmode, so no TLS is attempted.
//
// This covers the runtime connection only. `prisma migrate deploy` runs first,
// at container start, through Prisma's own engine and its own TLS stack, and
// reads the same URL with different semantics: #355.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
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
