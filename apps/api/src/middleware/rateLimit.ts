// apps/api/src/middleware/reateLimit.ts
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import { AppError } from "./errorHandler";

const isDev = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";

/**
 * All limiters route their 429 through the central error handler so the
 * response has the standard ApiError shape. express-rate-limit sets the
 * Retry-After and RateLimit-* headers before invoking this handler.
 */
function limitHandler(req: Request, res: Response, next: NextFunction) {
  next(new AppError("Too many requests, please try again later", 429));
}

/**
 * Rate limiting is a production/security concern, not something the
 * integration test suites (#52-#55) are testing — and since `isDev` is
 * false under NODE_ENV=test, the real limiters below would otherwise apply
 * their (low) production limits to test runs that fire dozens of requests
 * per file, causing flaky 429s unrelated to the behavior under test.
 */
function noopLimiter(_req: Request, _res: Response, next: NextFunction) {
  next();
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
export const globalLimiter = isTest
  ? noopLimiter
  : rateLimit({
      ...sharedOptions,
      windowMs: 15 * 60 * 1000,
      limit: isDev ? 1000 : 100,
    });

/**
 * Auth endpoints: 10 requests / 15 min per IP (brute-force protection).
 */
export const authLimiter = isTest
  ? noopLimiter
  : rateLimit({
      ...sharedOptions,
      windowMs: 15 * 60 * 1000,
      limit: isDev ? 100 : 10,
    });

/**
 * TMDB proxy endpoints: 30 requests / min per IP.
 * Exported now; applied to the TMDB router when it exists:
 *   app.use("/api/tmdb", tmdbLimiter, tmdbRouter)
 */
export const tmdbLimiter = isTest
  ? noopLimiter
  : rateLimit({
      ...sharedOptions,
      windowMs: 60 * 1000,
      limit: isDev ? 300 : 30,
    });
