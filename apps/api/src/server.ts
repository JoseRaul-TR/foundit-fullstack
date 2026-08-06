// apps/api/src/server.ts

/**
 * Process entrypoint: owns the listen()/HTTPS/graceful-shutdown lifecycle.
 * Express app construction itself lives in app.ts (imported below) so it
 * can be reused by Supertest in integration tests without this file's
 * side effects (binding a port, connecting to the DB at import time, signal
 * handlers) ever running.
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { env } from "@/config/env";
import prisma, { pool } from "@/lib/prisma";
import { app } from "@/app";

/**
 * Runs BEFORE listen(), so an unreachable database fails once — here — rather
 * than on every request that arrives afterwards.
 */
async function assertDatabaseReachable() {
  try {
    // A real query, not $connect(). With a driver adapter (PrismaPg over a
    // pg.Pool, see lib/prisma.ts) $connect() never reaches the network: the
    // pool opens no connection when constructed and connects lazily on first
    // use. It resolved happily with no database running at all.
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection error:", error);

    if (env.NODE_ENV === "production") {
      // Refuse to serve traffic against a database we cannot reach. Render
      // then reports a failed deploy, instead of a service that looks healthy
      // while erroring on every request.
      process.exit(1);
    }

    // Development stays lenient — working on the frontend with the database
    // stopped is a normal thing to do — but it has to say so out loud instead
    // of reporting success.
    console.warn(
      "⚠️  Starting without a database (development). Any request that touches it will fail.",
    );
  }
}

function onServerReady(protocol: "http" | "https") {
  console.log(`API server running on ${protocol}://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Frontend URL: ${env.FRONTEND_URL}`);
}

// Start Server
//
// USE_HTTPS is meant for LOCAL DEVELOPMENT ONLY, to test things that behave
// differently over a real TLS connection (Secure cookies, Google OAuth
// callback restrictions) before deploying. In production this must stay
// false: Render terminates TLS at its own edge and forwards plain HTTP to
// the container, so the Node process binding raw HTTPS itself would be
// redundant, not more secure — Render already provides the encryption
// between the browser and its edge.
//
// `server` is undefined until start() resolves, because the port is only
// opened after the database check passes. shutdown() below accounts for a
// signal arriving during that window.
let server: http.Server | https.Server | undefined;

async function start() {
  await assertDatabaseReachable();

  if (env.USE_HTTPS && env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH) {
    const httpsOptions = {
      key: fs.readFileSync(env.HTTPS_KEY_PATH),
      cert: fs.readFileSync(env.HTTPS_CERT_PATH),
    };
    server = https
      .createServer(httpsOptions, app)
      .listen(env.PORT, () => onServerReady("https"));
  } else {
    server = app.listen(env.PORT, () => onServerReady("http"));
  }
}

start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

// Graceful Server Shutdown
let shuttingDown = false;

/**
 * Extracted from server.close()'s callback so the async work has a place to
 * live: close() types its callback as returning void, and passing an async
 * function there means any rejection inside it becomes an unhandled promise
 * rejection instead of surfacing.
 */
async function closeDatabaseConnections(closeError?: Error) {
  if (closeError) {
    console.error("❌ Error closing HTTP server:", closeError);
  } else {
    console.log("✅ HTTP server closed");
  }

  try {
    await prisma.$disconnect();
    await pool.end();
    console.log("✅ Database connections closed");
    process.exit(closeError ? 1 : 0);
  } catch (dbErr) {
    console.error("❌ Error closing database connections:", dbErr);
    process.exit(1);
  }
}

// Not async: nothing in this body is awaited — the awaits live inside
// closeDatabaseConnections. Keeping it synchronous also means the signal
// handlers below don't hand a promise to a void-returning callback.
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully the server...`);

  const forceExit = setTimeout(() => {
    console.error("⏱️ Shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  // Signalled before the port was opened (during the database check, or while
  // it was failing in development): there is no server to close, only the
  // pool.
  if (!server) {
    void closeDatabaseConnections();
    return;
  }

  server.close((err) => void closeDatabaseConnections(err));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
