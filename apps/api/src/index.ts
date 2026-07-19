// apps/api/src/index.ts
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

import moviesRouter from "@/routes/movies";
import seriesRouter from "@/routes/series";
import searchRouter from "@/routes/search";
import discoverRouter from "@/routes/discover";
import peopleRouter from "@/routes/people";
import genresRouter from "@/routes/genres";
import providersRouter from "@/routes/providers";
import countriesRouter from "@/routes/countries";
import profileRouter from "@/routes/profile";
import profileCountriesRouter from "@/routes/profileCountries";
import profileServicesRouter from "@/routes/profileServices";
import watchlistRouter from "@/routes/watchlist";

// Create the Express app
const app = express();

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
app.use("/api/auth", authLimiter);
// IMPORTANT: Better Auth's handler must be mounted BEFORE express.json().
// It needs the raw, unparsed request body — if express.json() runs first,
// sign-up/sign-in requests will fail silently or with a body-parsing error.
// Express 5 (path-to-regexp v8) requires named wildcards: "*splat", not "*".
app.all("/api/auth/*splat", toNodeHandler(auth));

// JSON body parser for everything else, mounted after the auth handler
app.use(express.json());

app.use("/api/movies", tmdbLimiter, moviesRouter);
app.use("/api/series", tmdbLimiter, seriesRouter);
app.use("/api/search", tmdbLimiter, searchRouter);
app.use("/api/discover", tmdbLimiter, discoverRouter);
app.use("/api/people", tmdbLimiter, peopleRouter);
app.use("/api/genres", tmdbLimiter, genresRouter);
app.use("/api/providers", tmdbLimiter, providersRouter);
app.use("/api/countries", tmdbLimiter, countriesRouter);
app.use("/api/profile", profileRouter); // No tmdbLimiter, only calls to own db via Prisma
app.use("/api/profile/countries", profileCountriesRouter);
app.use("/api/profile/services", profileServicesRouter);
app.use("/api/watchlist", tmdbLimiter, watchlistRouter);

// Protected Route Example
app.get("/api/protected", requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "You are authenticated!",
    user: req.session?.user,
  });
});

// Health Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Root Endpoint
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

// Start Server
const server = app.listen(env.PORT, async () => {
  await testDatabaseConnection();
  console.log(`API server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Frontend URL: ${env.FRONTEND_URL}`);
});

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
