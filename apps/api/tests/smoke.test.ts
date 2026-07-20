// apps/api/tests/smoke.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { resetDatabase } from "./helpers/db";
import { createTestUser } from "./helpers/auth";

vi.mock("@/lib/tmdb", () => ({
  fetchTmdb: vi.fn(),
  fetchTmdbWithFallback: vi.fn(),
}));

describe("smoke", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET /health responds ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("createTestUser + authenticated request round-trip", async () => {
    const testUser = await createTestUser();
    const res = await request(app)
      .get("/api/v1/protected")
      .set("Cookie", testUser.cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(testUser.id);
  });
});
