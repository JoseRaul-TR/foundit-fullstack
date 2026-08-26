// apps/api/src/app.ts

/**
 * Express app construction ONLY — no listen(), no process-lifecycle code.
 * Split out from the former index.ts (now server.ts) so integration tests
 * can `import { app } from "@/app"` and drive it with Supertest without
 * binding a real port. server.ts imports this and is the actual process
 * entrypoint.
 *
 * In production this app also serves the Nuxt frontend (see the mount near
 * the bottom), so it is the single public origin for the whole product.
 */
import express, { type Request, type Response } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import { env } from "@/config/env";
import { toNodeHandler } from "better-auth/node";
import { auth, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { apiLimiter, authLimiter } from "@/middleware/rateLimit";

// Catalog domain (public TMDB-backed read endpoints)
import moviesRouter from "@/routes/catalog/movies";
import seriesRouter from "@/routes/catalog/series";
import searchRouter from "@/routes/catalog/search";
import discoverRouter from "@/routes/catalog/discover";
import peopleRouter from "@/routes/catalog/people";
import genresRouter from "@/routes/catalog/genres";
import providersRouter from "@/routes/catalog/providers";
import countriesRouter from "@/routes/catalog/countries";
import certificationsRouter from "@/routes/catalog/certifications";

// Profile domain (authenticated user settings)
import profileRouter from "@/routes/profile/profile";
import profileCountriesRouter from "@/routes/profile/countries";
import profileMediaStateRouter from "@/routes/profile/mediaState";
import profileServicesRouter from "@/routes/profile/services";

// Library domain (authenticated user media tracking)
import watchlistRouter from "@/routes/library/watchlist";
import historyRouter from "@/routes/library/history";
import ratingsRouter from "@/routes/library/ratings";

/**
 * All versioned business routes live under this prefix. /health and / stay
 * unversioned on purpose: infra/meta endpoints, not part of the versioned
 * contract. basePath in lib/auth.ts's betterAuth({...}) config MUST match
 * API_V1/auth.
 */
export const API_V1 = "/api/v1";

export const app = express();

/**
 * Render runs the API behind THREE hops: its own internal proxy, Cloudflare,
 * and the socket itself. Measured in production via a temporary diagnostic
 * endpoint (#<148>), X-Forwarded-For arrives as:
 * <real client>, <cloudflare>, <render internal>
 * With a lower value req.ip resolves to Render's internal address and every
 * express-rate-limit bucket becomes global — including authLimiter's 10
 * requests / 15 min, which would let ten login attempts anywhere lock out
 * authentication for everyone. A higher value would let clients spoof
 * X-Forwarded-For and bypass rate limiting entirely, so this number must be
 * re-measured if the hosting platform ever changes.
 */
app.set("trust proxy", 3);

/**
 * Content Security Policy.
 *
 * helmet's defaults apply; four directives are widened, each for a specific,
 * identifiable reason:
 *
 * - script-src: 'unsafe-inline' for Nuxt's hydration payload, and
 *   cloud.umami.is for the analytics script added in #264. Umami is the first
 *   third-party script this app loads, which is why this directive had never
 *   needed widening before.
 * - connect-src: cloud.umami.is again — the script beacons page views to
 *   /api/send on that host. Without this the script loads silently and
 *   reports nothing.
 * - img-src: TMDB posters and YouTube thumbnails.
 * - frame-src: the YouTube no-cookie embed for trailers.
 *
 * This header covers the frontend too: in production Express serves Nuxt's
 * build from this same app.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "https://cloud.umami.is"],
        // image.tmdb.org: posters, backdrops, profile photos, provider logos.
        // i.ytimg.com: the trailer thumbnails TrailerEmbed shows before the
        // iframe is mounted.
        "img-src": [
          "'self'",
          "data:",
          "https://image.tmdb.org",
          "https://i.ytimg.com",
        ],
        // TrailerEmbed embeds via youtube-nocookie only.
        "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
        "connect-src": ["'self'", "https://cloud.umami.is"],
      },
    },
  }),
);

/**
 * Only meaningful in development, where the frontend runs separately on
 * :3000 and really is a difficult origin. In production both are served from
 * this same process, so no request is cross-origin and this is inert.
 */
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

/**
 * Liveness: does this process exist and answer? Deliberately touches nothing
 * else — no database, no TMDB.
 *
 * This is the endpoint configured as Render's Health Check Path, and Render
 * calls it continuously. Querying the database here would keep Neon's compute
 * from ever autosuspending, which on the free plan is what makes the included
 * hours last the month: we would be paying for a permanently-awake database in
 * order to watch a service almost nobody visits. It would also turn a Neon
 * cold start into a failed deploy, since Render reads a failing health check
 * as a broken application.
 *
 * Real reachability is enforced at startup instead — see
 * assertDatabaseReachable in server.ts, where production refuses to open the
 * port at all if the database cannot be reached.
 *
 * Rate limiting: apiLimiter is scoped to API_V1, and this route is
 * unversioned, so nothing throttles it in any case. Still covered by helmet
 * and cors above.
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

/**
 * Readiness: can this process reach the database right now?
 *
 * For manual use — after a deploy, or when diagnosing. NOT for periodic
 * polling, for the reason given above: anything hitting this on a schedule
 * keeps Neon awake. Rate-limited because it is public and does hit the
 * database; that only raises the cost of abuse, it doesn't prevent it.
 */
app.get("/health/ready", apiLimiter, async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      database: "reachable",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      database: "unreachable",
      timestamp: new Date().toISOString(),
    });
  }
});

// Scoped to the API surface instead of applied globally: this same process
// now also serves the frontend, and a single page load pulls ~30 JS/CSS
// chunks from /_nuxt/, which exhausted the 100-requests-per-15-min budget on
// the very first visit. The assets then came back as 429 JSON, which the
// browser rejected as a MIME mismatch — the page rendered but never hydrated.
app.use(API_V1, apiLimiter);

// Strict limit on credential endpoints only, BEFORE the Better Auth handler.
// Mounting it on the whole /auth surface also caught get-session, which the
// frontend calls on EVERY page load — ten page views within fifteen minutes
// left a user unable to sign in at all. Everything under /auth is still
// covered by globalLimiter above.
app.use(`${API_V1}/auth/sign-in/email`, authLimiter);
app.use(`${API_V1}/auth/sign-up`, authLimiter);
app.use(`${API_V1}/auth/forget-password`, authLimiter);
app.use(`${API_V1}/auth/reset-password`, authLimiter);
// IMPORTANT: Better Auth's handler must be mounted BEFORE express.json().
// It needs the raw, unparsed request body — if express.json() runs first,
// sign-up/sign-in requests will fail silently or with a body-parsing error.
// Express 5 (path-to-regexp v8) requires named wildcards: "*splat", not "*".
app.all(`${API_V1}/auth/*splat`, toNodeHandler(auth));

// JSON body parser for everything else, mounted after the auth handler
app.use(express.json());

app.use(`${API_V1}/movies`, moviesRouter);
app.use(`${API_V1}/series`, seriesRouter);
app.use(`${API_V1}/search`, searchRouter);
app.use(`${API_V1}/discover`, discoverRouter);
app.use(`${API_V1}/people`, peopleRouter);
app.use(`${API_V1}/genres`, genresRouter);
app.use(`${API_V1}/providers`, providersRouter);
app.use(`${API_V1}/certifications`, certificationsRouter);
app.use(`${API_V1}/countries`, countriesRouter);
app.use(`${API_V1}/profile`, profileRouter);
app.use(`${API_V1}/profile/countries`, profileCountriesRouter);
app.use(`${API_V1}/profile/media-state`, profileMediaStateRouter);
app.use(`${API_V1}/profile/services`, profileServicesRouter);
app.use(`${API_V1}/watchlist`, watchlistRouter);
app.use(`${API_V1}/history`, historyRouter);
app.use(`${API_V1}/ratings`, ratingsRouter);

// Protected Route Example
app.get(`${API_V1}/protected`, requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "You are authenticated!",
    user: req.session?.user,
  });
});

/**
 * ––– Frontend –––
 *
 * Mounted as the last route: anything that didn't match an API route above is
 * a page request, and Nitro's `node` preset exports a plain (req, res) handler
 * for exactly this. It must come BEFORE notFoundHandler, which would
 * otherwise answer every page with a 404.
 *
 * Production only. In development the two apps run separately (nuxt dev on
 * :3000, this on :3001) and the build output below doesn't exist – the same
 * reason the integration tests, which import this file under NODE_ENV=test,
 * skip it too.
 *
 * The specifier is held in a variable on purpose: esbuild would otherwise
 * statically resolve it and try to inline Nitro's entire output into our
 * bundle. As a runtime dynamic import it stays external, and Node resolves it
 * relative to dist/server.js – i.e. apps/web/.output/server/index.mjs.
 */
if (env.NODE_ENV === "production") {
  // Trailing slash matters: it makes the relative joins below resolve inside
  // .output/ rather than next to it.
  const webOutput = new URL("../../web/.output/", import.meta.url);
  const publicDir = fileURLToPath(new URL("public", webOutput));

  // Nitro's `node` preset produces ONLY a request handler for SSR and server
  // routes — unlike the standalone `node-server` preset it does NOT serve
  // .output/public, leaving that to the host server. Without these two lines
  // every /_nuxt/* chunk falls through to the API's 404 handler and comes
  // back as JSON, so the page renders but never hydrates.

  // Build output: filenames carry a content hash, so they can be cached
  // indefinitely — a new build produces new filenames.
  app.use(
    "/_nuxt",
    express.static(path.join(publicDir, "_nuxt"), {
      immutable: true,
      maxAge: "1y",
    }),
  );

  // Everything copied from apps/web/public (favicon, logos): NOT hashed, so
  // no aggressive caching. index:false so "/" keeps falling through to SSR.
  app.use(express.static(publicDir, { index: false }));

  const { handler } = (await import(
    new URL("server/index.mjs", webOutput).href
  )) as {
    handler: (req: IncomingMessage, res: ServerResponse) => void;
  };
  app.use(handler);
}

// 404 handler
app.use(notFoundHandler);

// Global errors handler
app.use(errorHandler);

export default app;
