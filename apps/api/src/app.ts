// apps/api/src/server.ts// apps/api/src/app.ts
//
// Express app construction ONLY — no listen(), no process-lifecycle code.
// Split out from the former index.ts (now server.ts) so integration tests
// can `import { app } from "@/app"` and drive it with Supertest without
// binding a real port. server.ts imports this and is the actual process
// entrypoint.
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "@/config/env";
import { toNodeHandler } from "better-auth/node";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";
import { auth, requireAuth } from "@/lib/auth";
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

// All versioned business routes live under this prefix. /health and / stay
// unversioned on purpose: infra/meta endpoints, not part of the versioned
// contract. basePath in lib/auth.ts's betterAuth({...}) config MUST match
// API_V1/auth.
export const API_V1 = "/api/v1";

export const app = express();

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

// Strict limit on auth BEFORE the Better Auth handler
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

// Protected Route Example
app.get(`${API_V1}/protected`, requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "You are authenticated!",
    user: req.session?.user,
  });
});

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

export default app;
