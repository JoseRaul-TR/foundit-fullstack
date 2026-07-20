// apps/api/tests/helpers/auth.ts
//
// createTestUser() for #53-#55, which need an authenticated user as SETUP
// and aren't testing auth itself. #52 (auth flows) instead drives Supertest
// straight at the real /api/v1/auth/* HTTP endpoints — see auth.test.ts.
//
// Built on Better Auth's official testUtils() plugin
// (https://better-auth.com/docs/plugins/test-utils), which Better Auth
// explicitly recommends keeping in a SEPARATE test-only auth instance
// rather than the production config in lib/auth.ts — so this file builds
// its own betterAuth() instance instead of importing `auth` from lib/auth.ts.
//
// This still works against the real app under test: both instances point
// at the same Postgres DB (via the shared `prisma` singleton) and share the
// same BETTER_AUTH_SECRET/session config, so a session this instance writes
// to the `session` table is valid when the real app's `auth.api.getSession()`
// reads it back — Better Auth validates purely via DB lookup + secret, not
// per-instance state.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { testUtils } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import { env } from "@/config/env";

const testAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/v1/auth",
  plugins: [testUtils()],
});

let counter = 0;

export interface TestUser {
  id: string;
  email: string;
  name: string;
  /** Ready to pass to supertest: `.set("Cookie", testUser.cookie)` */
  cookie: string;
}

export async function createTestUser(
  overrides: { email?: string; name?: string } = {},
): Promise<TestUser> {
  counter += 1;
  const ctx = await testAuth.$context;
  const test = ctx.test;

  const user = test.createUser({
    email: overrides.email ?? `test-user-${Date.now()}-${counter}@foundit.test`,
    name: overrides.name ?? `Test User ${counter}`,
    emailVerified: true,
  });
  const savedUser = await test.saveUser(user);
  const headers = await test.getAuthHeaders({ userId: savedUser.id });
  const cookie = headers.get("cookie");

  if (!cookie) {
    throw new Error(
      "createTestUser: testUtils().getAuthHeaders() returned no cookie header",
    );
  }

  return {
    id: savedUser.id,
    email: savedUser.email,
    name: savedUser.name ?? "",
    cookie,
  };
}
