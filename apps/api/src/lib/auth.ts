// apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import prisma from "./prisma";
import { AppError } from "@/middleware/errorHandler";

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
  // Must match the path index.ts mounts the Better Auth handler at
  // (`${API_V1}/auth`). If these ever drift apart, Better Auth's internal
  // link/redirect generation (and the frontend's authClient baseURL) will
  // silently point at the wrong path.
  basePath: "/api/v1/auth",
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
    return next(new AppError("Unauthorized", 401));
  }

  req.session = session;
  next();
}

/**
 * Reads the authenticated user's id off req.session, throwing 401 if
 * missing. requireAuth guarantees req.session is set at runtime, but TS
 * can't narrow that across separate middleware/handler functions — this
 * centralizes the defensive check that was previously copy-pasted at the
 * top of every authenticated route handler (15+ occurrences across
 * #46-#51).
 */
export function getUserId(req: Request): string {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }
  return userId;
}

export default auth;
