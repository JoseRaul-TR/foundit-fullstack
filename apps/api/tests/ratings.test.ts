/**
 * apps/api/tests/ratings.test.ts  (ticket #55)
 *
 * FIX applied alongside this suite: services/library/ratings.ts's
 * removeRating() had the same bug as #53's removeFromWatchlist — deleteMany()
 * without checking the result, so DELETE on a non-existent rating silently
 * returned 200 instead of 404. Fixed to check count and throw AppError(404).
 *
 * TMDB fully mocked via vi.mock("@/lib/tmdb") — fetchBasicMediaInfo() (used
 * by GET's enrichment) calls through to fetchTmdb() internally.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/lib/prisma";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { fetchTmdb } from "@/lib/tmdb";
import { movieFixture } from "./fixtures/tmdb";

vi.mock("@/lib/tmdb", () => ({
  fetchTmdb: vi.fn(),
  fetchTmdbWithFallback: vi.fn(),
}));

const mockedFetchTmdb = vi.mocked(fetchTmdb);
const RATINGS_BASE = "/api/v1/ratings";

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.${Math.floor(ipCounter / 65536) % 256}.${Math.floor(ipCounter / 256) % 256}.${ipCounter % 256}`;
}

async function authed(testUser: TestUser) {
  const ip = uniqueIp();
  return {
    get: (path: string) =>
      request(app)
        .get(path)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie),
    post: (path: string) =>
      request(app)
        .post(path)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie),
    delete: (path: string) =>
      request(app)
        .delete(path)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie),
  };
}

describe("ratings integration (#55)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedFetchTmdb.mockReset();
  });

  describe("POST /ratings", () => {
    it("creates a rating between 1 and 10", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const res = await (await authed(testUser)).post(RATINGS_BASE).send({
        tmdbId: 550,
        mediaType: "movie",
        rating: 8,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(8);
      expect(res.body.data.tmdbId).toBe(550);

      const row = await prisma.userRating.findFirst({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(row?.rating).toBe(8);
    });

    it("updates the existing rating on a duplicate instead of creating a new row", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(movieFixture());
      const client = await authed(testUser);

      await client
        .post(RATINGS_BASE)
        .send({ tmdbId: 550, mediaType: "movie", rating: 5 });
      const res = await client
        .post(RATINGS_BASE)
        .send({ tmdbId: 550, mediaType: "movie", rating: 9 });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(9);

      const count = await prisma.userRating.count({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(count).toBe(1);

      const row = await prisma.userRating.findFirst({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(row?.rating).toBe(9);
    });

    it("returns 400 for a rating below 1 or above 10", async () => {
      const testUser = await createTestUser();
      const client = await authed(testUser);

      const tooLow = await client
        .post(RATINGS_BASE)
        .send({ tmdbId: 550, mediaType: "movie", rating: 0 });
      expect(tooLow.status).toBe(400);

      const tooHigh = await client
        .post(RATINGS_BASE)
        .send({ tmdbId: 550, mediaType: "movie", rating: 11 });
      expect(tooHigh.status).toBe(400);
    });

    it("returns 400 for a non-integer rating", async () => {
      const testUser = await createTestUser();
      const res = await (await authed(testUser)).post(RATINGS_BASE).send({
        tmdbId: 550,
        mediaType: "movie",
        rating: 5.5,
      });

      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post(RATINGS_BASE)
        .send({ tmdbId: 550, mediaType: "movie", rating: 8 });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /ratings/:tmdbId/:mediaType", () => {
    it("removes a rating", async () => {
      const testUser = await createTestUser();
      await prisma.userRating.upsert({
        where: {
          userId_tmdbId_mediaType: {
            userId: testUser.id,
            tmdbId: 550,
            mediaType: "movie",
          },
        },
        create: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          rating: 7,
        },
        update: { rating: 7 },
      });

      const res = await (
        await authed(testUser)
      ).delete(`${RATINGS_BASE}/550/movie`);
      expect(res.status).toBe(200);

      const row = await prisma.userRating.findFirst({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(row).toBeNull();
    });

    it("returns 404 if no rating exists", async () => {
      const testUser = await createTestUser();
      const res = await (
        await authed(testUser)
      ).delete(`${RATINGS_BASE}/999999/movie`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /ratings", () => {
    it("returns all user ratings with TMDB data", async () => {
      const testUser = await createTestUser();
      await prisma.userRating.upsert({
        where: {
          userId_tmdbId_mediaType: {
            userId: testUser.id,
            tmdbId: 550,
            mediaType: "movie",
          },
        },
        create: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          rating: 8,
        },
        update: { rating: 8 },
      });
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const res = await (await authed(testUser)).get(RATINGS_BASE);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].rating).toBe(8);
      expect(res.body.data.results[0].tmdb.title).toBe("Fight Club");
    });
  });
});
