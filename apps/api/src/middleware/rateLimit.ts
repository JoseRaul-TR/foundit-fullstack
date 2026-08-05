// apps/api/src/middleware/reateLimit.ts
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import { AppError } from "./errorHandler";

const isDev = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";

/**
 * Rate limiting lives here and ONLY here.
 *
 * Better Auth ships its own limiter, disabled in lib/auth.ts: it never sees
 * the socket address (its handler only receives a web Request) and fell back
 * to a single shared bucket for every client, which is worse than no limiter
 * at all — it turns one abusive client into an outage for everyone. The
 * Express side resolves the real client IP through `trust proxy` (measured in
 * production, see the comment in app.ts), so that's where the single layer
 * lives. Don't restore the built-in one.
 *
 * Two limiters, two distinct purposes:
 *
 *  - apiLimiter protects service availability and the TMDB quota our own API
 *    key pays for. It replaced a pair of overlapping limiters (100/15min
 *    globally plus 30/min on catalog routes) that guarded the same thing with
 *    incoherent windows: the per-minute one was in fact more permissive over
 *    any sustained period, so it only ever caught short bursts, and stacking
 *    them meant the RateLimit-* headers reported whichever ran last — leaving
 *    clients unable to tell which limit actually applied.
 *
 *  - authLimiter protects credentials against brute force. It's the one that
 *    can't be replaced by authentication, since sign-in must be reachable
 *    without a session by definition.
 *
 * No short burst window on purpose: Cloudflare sits in front of Render and
 * absorbs volumetric traffic, and a second window at this scale adds
 * complexity — and room for error — without covering anything the first
 * doesn't.
 */
function limitHandler(req: Request, res: Response, next: NextFunction) {
  next(new AppError("Too many requests, please try again later", 429));
}

/**
 * Rate limiting is a production concern, not something the integration suites
 * test — and since `isDev` is false under NODE_ENV=test, the real limits below
 * would apply to runs that fire dozens of requests per file, causing flaky
 * 429s unrelated to the behaviour under test.
 */
function noopLimiter(_req: Request, _res: Response, next: NextFunction) {
  next();
}

const sharedOptions = {
  standardHeaders: true, // RateLimit-* headers (includes retry info)
  legacyHeaders: false, // disable deprecated X-RateLimit-*
  handler: limitHandler,
  // Requests this process makes to itself — Nuxt's SSR calling the API over
  // loopback, see useApiBase in apps/web — arrive with no proxy headers, so
  // req.ip is 127.0.0.1 for every single one. Without this they all share one
  // bucket and exhaust it after a handful of page loads, locking real users
  // out of sign-in entirely. Safe to skip: external traffic always reaches us
  // through Render's proxy chain, which sets X-Forwarded-For, so it can never
  // present itself as loopback.
  skip: (req: Request) =>
    req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "..ffff:127.0.0.1",
} as const;

/**
 * Everything under /api/v1: 600 requests / 15 min per IP.
 *
 * The number is measured, not guessed. The previous limit of 100 was chosen
 * arbitrarily and turned out to be hostile to normal use: a few minutes of
 * ordinary browsing in production (a couple of searches, some detail modals,
 * Watchlist, History, Profile) consumed 72 of them — roughly 18 requests a
 * minute. 600 leaves comfortable headroom for a heavier session, several open
 * tabs, or several users sharing one address behind NAT, while still capping
 * abuse at well under one request per second.
 */

export const apiLimiter = isTest
  ? noopLimiter
  : rateLimit({
      ...sharedOptions,
      windowMs: 15 * 60 * 1000,
      limit: isDev ? 6000 : 600,
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
