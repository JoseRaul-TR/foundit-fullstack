// apps/api/src/middleware/reateLimit.ts
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { env } from "src/config/env";
import { AppError } from "./errorHandler";

const isDev = env.NODE_ENV === "development";

/**
 * All limiters route their 429 through the central error handler so the
 * response has the standard ApiError shape. express-rate-limit sets the
 * Retry-After and RateLimit-* headers before invoking this handler.
 */
function limitHandler(req: Request, res: Response, next: NextFunction) {
  next(new AppError("Too many requests, please try again later", 429));
}

const sharedOptions = {
  standardHeaders: true, // RateLimit-* headers (includes retry info)
  legacyHeaders: false, // disable deprecated X-RateLimit-*
  handler: limitHandler,
} as const;

/**
 * Global: 100 requests / 15 min per IP.
 * Dev limits are 10x so local testing never locks out.
 */
export const globalLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 1000 : 100,
});

/**
 * Auth endpoints: 10 requests / 15 min per IP (brute-force protection).
 */
export const authLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 100 : 0,
});

/**
 * TMDB proxy endpoints: 30 requests / min per IP.
 * Exported now; applied to the TMDB router when it exists:
 *   app.use("/api/tmdb", tmdbLimiter, tmdbRouter)
 */
export const tmdbLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000,
  limit: isDev ? 300 : 30,
});
