// apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import prisma from "./prisma";

// User and Session types definitions
type BetterAuthUser = {
  id: string;
  name?: string | null;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BetterAuthSession = {
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: BetterAuthUser;
};

export type AuthSession = BetterAuthSession | null;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cookie cache
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: [env.FRONTEND_URL],
  advanced: {
    // HTTP-only + Secure cookies in production, relaxed locally over http
    useSecureCookies: env.NODE_ENV === "production",
  },
});

/**
 * Extracts the current session/user from the request, or null if unauthenticated.
 */
export async function extractSession(
  req: Request,
): Promise<BetterAuthUser | null> {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  return session?.user ?? null;
}

/**
 * Middleware that rejects unauthenticated requests with 401.
 * Attaches the resolved session to req.session on success.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session || !session.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
      },
    });
  }

  req.session = session as AuthSession;
  next();
}

export default auth;
