/**
 * apps/api/tests/auth.test.ts  (ticket #52)
 *
 * Two deliberate deviations from the ticket's literal text, verified
 * against the installed better-auth@1.6.23 source (not guessed):
 *
 *  - "GET /api/auth/session" doesn't exist on Better Auth's real router —
 *    the actual endpoint is GET /get-session (see
 *    node_modules/better-auth/dist/api/routes/session.d.mts). Testing
 *    /api/v1/auth/get-session instead.
 *  - "Returns 409 if email already exists" — with our config
 *    (requireEmailVerification: false, autoSignIn defaulting to true),
 *    Better Auth's anti-enumeration protection is inactive and the
 *    sign-up route throws APIError.from("UNPROCESSABLE_ENTITY",
 *    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL) -> HTTP 422, not 409 (see
 *    sign-up.mjs). Asserting the real 422 here; flag if you'd rather wrap
 *    the Better Auth handler to remap this to 409.
 *
 * Rate limiting workaround: authLimiter is 10 req/15min per IP in
 * NODE_ENV=test (isDev is false there too, same as production — see
 * rateLimit.ts), and express-rate-limit's in-memory store is a
 * module-level singleton that persists for the whole `vitest run` process,
 * not reset between test files. This suite alone makes ~13 requests to
 * /api/v1/auth/*, which would blow through that budget partway through and
 * fail tests with 429s that have nothing to do with the auth logic under
 * test. Fix: give each `it()` its own fake X-Forwarded-For IP via
 * uniqueIp() — trust proxy is set to 1 in app.ts, so Express honors it as
 * the request's req.ip, and each simulated "client" gets its own rate-limit
 * bucket. This is test-file-local; no production code changes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { resetDatabase } from "./helpers/db";
import { createTestUser } from "./helpers/auth";

const AUTH_BASE = "/api/v1/auth";

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.${Math.floor(ipCounter / 65536) % 256}.${Math.floor(ipCounter / 256) % 256}.${ipCounter % 256}`;
}

describe("auth integration (#52)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /sign-up/email", () => {
    it("creates a user with valid email and password", async () => {
      const ip = uniqueIp();
      const res = await request(app)
        .post(`${AUTH_BASE}/sign-up/email`)
        .set("X-Forwarded-For", ip)
        .send({
          name: "Alice",
          email: "alice@example.com",
          password: "password1234",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("alice@example.com");
      expect(res.body.user.name).toBe("Alice");
    });

    it("returns 400 with invalid email format", async () => {
      const ip = uniqueIp();
      const res = await request(app)
        .post(`${AUTH_BASE}/sign-up/email`)
        .set("X-Forwarded-For", ip)
        .send({ name: "Bob", email: "not-an-email", password: "password1234" });

      expect(res.status).toBe(400);
    });

    it("returns 422 if email already exists", async () => {
      const ip = uniqueIp();
      const email = "dup@example.com";
      await request(app)
        .post(`${AUTH_BASE}/sign-up/email`)
        .set("X-Forwarded-For", ip)
        .send({ name: "Carol", email, password: "password1234" });

      const res = await request(app)
        .post(`${AUTH_BASE}/sign-up/email`)
        .set("X-Forwarded-For", ip)
        .send({ name: "Carol Again", email, password: "differentpassword" });

      expect(res.status).toBe(422);
    });
  });

  describe("POST /sign-in/email", () => {
    it("returns a session cookie with valid credentials", async () => {
      const ip = uniqueIp();
      const email = "dave@example.com";
      const password = "password1234";
      await request(app)
        .post(`${AUTH_BASE}/sign-up/email`)
        .set("X-Forwarded-For", ip)
        .send({ name: "Dave", email, password });

      const res = await request(app)
        .post(`${AUTH_BASE}/sign-in/email`)
        .set("X-Forwarded-For", ip)
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"]?.length).toBeGreaterThan(0);
    });

    it("returns 401 with wrong password", async () => {
      const ip = uniqueIp();
      const email = "erin@example.com";
      await request(app)
        .post(`${AUTH_BASE}/sign-up/email`)
        .set("X-Forwarded-For", ip)
        .send({ name: "Erin", email, password: "correctpassword" });

      const res = await request(app)
        .post(`${AUTH_BASE}/sign-in/email`)
        .set("X-Forwarded-For", ip)
        .send({ email, password: "wrongpassword" });

      expect(res.status).toBe(401);
    });

    it("returns 401 with non-existent email", async () => {
      const ip = uniqueIp();
      const res = await request(app)
        .post(`${AUTH_BASE}/sign-in/email`)
        .set("X-Forwarded-For", ip)
        .send({ email: "nobody@example.com", password: "whatever123" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /get-session", () => {
    it("returns user data with a valid session", async () => {
      const ip = uniqueIp();
      const testUser = await createTestUser();

      const res = await request(app)
        .get(`${AUTH_BASE}/get-session`)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(testUser.id);
    });

    it("returns null without a session", async () => {
      const ip = uniqueIp();
      const res = await request(app)
        .get(`${AUTH_BASE}/get-session`)
        .set("X-Forwarded-For", ip);

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("POST /sign-out", () => {
    it("clears the session cookie", async () => {
      const ip = uniqueIp();
      const testUser = await createTestUser();

      const signOutRes = await request(app)
        .post(`${AUTH_BASE}/sign-out`)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie);
      expect(signOutRes.status).toBe(200);

      // Sign-out must invalidate the session server-side, not just tell the
      // client to drop the cookie — reusing the old cookie must now fail.
      const sessionRes = await request(app)
        .get(`${AUTH_BASE}/get-session`)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie);
      expect(sessionRes.body).toBeNull();
    });
  });
});
