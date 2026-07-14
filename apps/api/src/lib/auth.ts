// apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      // Google verifies emails, so it's safe to auto-link a Google sign-in
      // to an existing email/password user with the same (verified) email.
      trustedProviders: ["google"],
    },
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

// Derived from the auth instance itself — stays in sync automatically
export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

/**
 * Extracts the current session/user from the request, or null if unauthenticated.
 */
export async function extractSession(
  req: Request,
): Promise<AuthSession["user"] | null> {
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

  req.session = session;
  next();
}

export default auth;
