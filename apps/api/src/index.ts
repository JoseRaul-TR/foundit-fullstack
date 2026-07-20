// apps/api/src/index.ts
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "@/config/env";
import { toNodeHandler } from "better-auth/node";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";
import { auth, requireAuth } from "@/lib/auth";
import prisma, { pool } from "@/lib/prisma";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import {
  authLimiter,
  globalLimiter,
  tmdbLimiter,
} from "@/middleware/rateLimit";

// Catalog domain (public TMDB-backed read endpoints)
import moviesRouter from "@/routes/catalog/movies";
import seriesRouter from "@/routes/catalog/series";
import searchRouter from "@/routes/catalog/search";
import discoverRouter from "@/routes/catalog/discover";
import peopleRouter from "@/routes/catalog/people";
import genresRouter from "@/routes/catalog/genres";
import providersRouter from "@/routes/catalog/providers";
import countriesRouter from "@/routes/catalog/countries";

// Profile domain (authenticated user settings)
import profileRouter from "@/routes/profile/profile";
import profileCountriesRouter from "@/routes/profile/countries";
import profileServicesRouter from "@/routes/profile/services";

// Library domain (authenticated user media tracking)
import watchlistRouter from "@/routes/library/watchlist";
import historyRouter from "@/routes/library/history";
import ratingsRouter from "@/routes/library/ratings";

// Create the Express app
const app = express();

// All versioned business routes live under this prefix. /health and / stay
// unversioned on purpose: they're infra/meta endpoints (load balancer health
// checks, a root sanity check), not part of the API's versioned contract —
// tools like Railway's healthcheck shouldn't have to know about API versions.
// basePath in lib/auth.ts's betterAuth({...}) config MUST match API_V1/auth.
const API_V1 = "/api/v1";

// Railway runs the API behind a reverse proxy. Without this, req.ip is the
// proxy's IP and ALL users would share one rate-limit bucket. Trust exactly
// one proxy hop.
app.set("trust proxy", 1);

// ——— Security Middleware ———
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(globalLimiter);

//Strict limit on auth BEFORE the Better Auth handler
app.use(`${API_V1}/auth`, authLimiter);
// IMPORTANT: Better Auth's handler must be mounted BEFORE express.json().
// It needs the raw, unparsed request body — if express.json() runs first,
// sign-up/sign-in requests will fail silently or with a body-parsing error.
// Express 5 (path-to-regexp v8) requires named wildcards: "*splat", not "*".
app.all(`${API_V1}/auth/*splat`, toNodeHandler(auth));

// JSON body parser for everything else, mounted after the auth handler
app.use(express.json());

app.use(`${API_V1}/movies`, tmdbLimiter, moviesRouter);
app.use(`${API_V1}/series`, tmdbLimiter, seriesRouter);
app.use(`${API_V1}/search`, tmdbLimiter, searchRouter);
app.use(`${API_V1}/discover`, tmdbLimiter, discoverRouter);
app.use(`${API_V1}/people`, tmdbLimiter, peopleRouter);
app.use(`${API_V1}/genres`, tmdbLimiter, genresRouter);
app.use(`${API_V1}/providers`, tmdbLimiter, providersRouter);
app.use(`${API_V1}/countries`, tmdbLimiter, countriesRouter);
app.use(`${API_V1}/profile`, profileRouter); // No tmdbLimiter, only calls to own db via Prisma
app.use(`${API_V1}/profile/countries`, profileCountriesRouter);
app.use(`${API_V1}/profile/services`, profileServicesRouter);
app.use(`${API_V1}/watchlist`, tmdbLimiter, watchlistRouter);
app.use(`${API_V1}/history`, tmdbLimiter, historyRouter);
app.use(`${API_V1}/ratings`, tmdbLimiter, ratingsRouter);

// Health Endpoint (unversioned — see API_V1 comment above)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Root Endpoint (unversioned — see API_V1 comment above)
app.get("/", (req: Request, res: Response) => {
  res.send(
    `FoundIt API is running! LOCALE_TO_TMDB_LANG['es'] = ${LOCALE_TO_TMDB_LANG["es"]}`,
  );
});

// 404 handler
app.use(notFoundHandler);

// Global errors handler
app.use(errorHandler);

// Test the connection to the database
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
// false: Railway (see "trust proxy" above) terminates TLS at its own edge
// and forwards plain HTTP to the container, so the Node process binding
// raw HTTPS itself would be redundant, not more secure — Railway already
// provides the encryption between the browser and its edge.
//
// To generate local certs: `brew install mkcert && mkcert -install`, then
// from a `certs/` folder (gitignored) run `mkcert localhost 127.0.0.1 ::1`
// and point HTTPS_KEY_PATH/HTTPS_CERT_PATH at the generated files in .env.
let server: http.Server | https.Server;

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

// Graceful Server Shutdown
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return; // ignore repeated signals
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully the server...`);

  // Force-exit if cleanup hangs (e.g. a stuck DB connection)
  const forceExit = setTimeout(() => {
    console.error("⏱️ Shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  // 1. Stop accepting new connections; wait for in-flight requests to finish
  server.close(async (err) => {
    if (err) {
      console.error("❌ Error closing HTTP server:", err);
    } else {
      console.log("✅ HTTP server closed");
    }

    // 2. Close database resources
    try {
      await prisma.$disconnect();
      await pool.end();
      console.log("✅ Database connections closed");
      process.exit(err ? 1 : 0);
    } catch (dbErr) {
      console.error("❌ Error closing database connections:", dbErr);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C
process.on("SIGTERM", () => shutdown("SIGTERM")); // Railway/Docker stop
