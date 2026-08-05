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

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}

async function onServerReady(protocol: "http" | "https") {
  await testDatabaseConnection();
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
// `void` on onServerReady: listen()'s callback is typed as returning void,
// and onServerReady is async. Marking it explicitly says "start this and
// don't wait", which is the intent — nothing can act on its completion here.
let server: http.Server | https.Server;

if (env.USE_HTTPS && env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH) {
  const httpsOptions = {
    key: fs.readFileSync(env.HTTPS_KEY_PATH),
    cert: fs.readFileSync(env.HTTPS_CERT_PATH),
  };
  server = https
    .createServer(httpsOptions, app)
    .listen(env.PORT, () => void onServerReady("https"));
} else {
  server = app.listen(env.PORT, () => void onServerReady("http"));
}

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

  server.close((err) => void closeDatabaseConnections(err));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
