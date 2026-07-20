/**
 * apps/api/tests/watchlist.test.ts  (ticket #53)
 *
 * FIX applied alongside this suite: services/library/watchlist.ts's
 * removeFromWatchlist() previously called deleteMany() and returned
 * unconditionally, so DELETEing an item never on the watchlist silently
 * "succeeded" with 200 (deleteMany doesn't throw on zero matches) instead
 * of the 404 this ticket requires. Fixed to check the returned count and
 * throw AppError(404) — see the FIX comment in watchlist.ts itself.
 *
 * TMDB is fully mocked via vi.mock("@/lib/tmdb") — fetchMediaRaw() (the
 * helper the watchlist service actually calls) calls through to fetchTmdb()
 * internally, so mocking fetchTmdb covers every enrichment call here.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/lib/prisma";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { fetchTmdb } from "@/lib/tmdb";
import { movieFixture, seriesFixture, watchProviders } from "./fixtures/tmdb";

vi.mock("@/lib/tmdb", () => ({
  fetchTmdb: vi.fn(),
  fetchTmdbWithFallback: vi.fn(),
}));

const mockedFetchTmdb = vi.mocked(fetchTmdb);
const WATCHLIST_BASE = "/api/v1/watchlist";

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

describe("watchlist integration (#53)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedFetchTmdb.mockReset();
  });

  describe("POST /watchlist", () => {
    it("adds a movie to the watchlist", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const res = await (await authed(testUser)).post(WATCHLIST_BASE).send({
        tmdbId: 550,
        mediaType: "movie",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.tmdbId).toBe(550);
      expect(res.body.data.mediaType).toBe("movie");
      expect(res.body.data.tmdb.title).toBe("Fight Club");

      const row = await prisma.watchlistItem.findFirst({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(row).not.toBeNull();
    });

    it("adding a duplicate returns 200 without creating a duplicate row", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(movieFixture());
      const client = await authed(testUser);

      const first = await client
        .post(WATCHLIST_BASE)
        .send({ tmdbId: 550, mediaType: "movie" });
      const second = await client
        .post(WATCHLIST_BASE)
        .send({ tmdbId: 550, mediaType: "movie" });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      const count = await prisma.watchlistItem.count({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(count).toBe(1);
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post(WATCHLIST_BASE)
        .send({ tmdbId: 550, mediaType: "movie" });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /watchlist/:tmdbId/:mediaType", () => {
    it("removes an item from the watchlist", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          title: "Fight Club",
          year: 1999,
        },
      });

      const res = await (
        await authed(testUser)
      ).delete(`${WATCHLIST_BASE}/550/movie`);
      expect(res.status).toBe(200);

      const row = await prisma.watchlistItem.findFirst({
        where: { userId: testUser.id, tmdbId: 550, mediaType: "movie" },
      });
      expect(row).toBeNull();
    });

    it("returns 404 if the item is not in the watchlist", async () => {
      const testUser = await createTestUser();
      const res = await (
        await authed(testUser)
      ).delete(`${WATCHLIST_BASE}/999999/movie`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /watchlist", () => {
    it("returns paginated items with TMDB data", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          title: "Fight Club",
          year: 1999,
        },
      });
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const res = await (await authed(testUser)).get(WATCHLIST_BASE);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.totalResults).toBe(1);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].tmdb.title).toBe("Fight Club");
      expect(res.body.data.results[0].tmdb.posterPath).toBe("/poster.jpg");
    });

    it("filters by type", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          title: "Fight Club",
          year: 1999,
        },
      });
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 1396,
          mediaType: "series",
          title: "Breaking Bad",
          year: 2008,
        },
      });
      mockedFetchTmdb.mockImplementation(async (path: string) =>
        path.startsWith("/tv/") ? seriesFixture() : movieFixture(),
      );

      const moviesOnly = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?type=movie`);
      expect(moviesOnly.body.data.results).toHaveLength(1);
      expect(moviesOnly.body.data.results[0].mediaType).toBe("movie");

      const seriesOnly = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?type=series`);
      expect(seriesOnly.body.data.results).toHaveLength(1);
      expect(seriesOnly.body.data.results[0].mediaType).toBe("series");

      const all = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?type=all`);
      expect(all.body.data.results).toHaveLength(2);
    });

    it("sorts by title, year, and added (default)", async () => {
      const testUser = await createTestUser();
      // Deliberately chosen so added/title/year orders are all pairwise
      // different, so each assertion below can only pass if that specific
      // sort mode is actually being applied (not just DB insertion order).
      // createdAt is set explicitly (overriding @default(now())) rather
      // than relying on three back-to-back create() calls landing in
      // distinct milliseconds — they don't reliably: on a fast machine
      // items 1 and 2 above landed in the same millisecond, and Postgres
      // doesn't guarantee tie-break order for equal createdAt values
      // without a secondary sort key, which flaked this test.
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 1,
          mediaType: "movie",
          title: "Zeta",
          year: 2020,
          createdAt: new Date("2024-01-01T00:00:00Z"), // added 1st (oldest)
        },
      });
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 2,
          mediaType: "movie",
          title: "Alpha",
          year: 1990,
          createdAt: new Date("2024-01-02T00:00:00Z"), // added 2nd
        },
      });
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 3,
          mediaType: "movie",
          title: "Mango",
          year: 2010,
          createdAt: new Date("2024-01-03T00:00:00Z"), // added 3rd (newest)
        },
      });
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const byAdded = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?sort=added`);
      expect(
        byAdded.body.data.results.map((r: { tmdbId: number }) => r.tmdbId),
      ).toEqual([3, 2, 1]); // most recently added first

      const byTitle = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?sort=title`);
      expect(
        byTitle.body.data.results.map((r: { tmdbId: number }) => r.tmdbId),
      ).toEqual([2, 3, 1]); // Alpha, Mango, Zeta

      const byYear = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?sort=year`);
      expect(
        byYear.body.data.results.map((r: { tmdbId: number }) => r.tmdbId),
      ).toEqual([1, 3, 2]); // 2020, 2010, 1990
    });

    it("highlights a subscribed service when the user has that provider", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          title: "Fight Club",
          year: 1999,
        },
      });
      await prisma.userStreamingService.create({
        data: { userId: testUser.id, providerId: 8, countryCode: "US" },
      });
      mockedFetchTmdb.mockResolvedValue(
        movieFixture({
          "watch/providers": watchProviders("US", [
            { providerId: 8, name: "Netflix", logoPath: "/netflix.jpg" },
          ]),
        }),
      );

      const res = await (await authed(testUser)).get(WATCHLIST_BASE);
      const item = res.body.data.results[0];

      expect(item.highlight.available).toBe(true);
      expect(item.highlight.services).toEqual([
        { name: "Netflix", logoPath: "/netflix.jpg" },
      ]);
    });

    it("shows no highlight when the user has no matching service", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          title: "Fight Club",
          year: 1999,
        },
      });
      // User is subscribed to a DIFFERENT provider than the one TMDB returns.
      await prisma.userStreamingService.create({
        data: { userId: testUser.id, providerId: 337, countryCode: "US" },
      });
      mockedFetchTmdb.mockResolvedValue(
        movieFixture({
          "watch/providers": watchProviders("US", [
            { providerId: 8, name: "Netflix", logoPath: "/netflix.jpg" },
          ]),
        }),
      );

      const res = await (await authed(testUser)).get(WATCHLIST_BASE);
      const item = res.body.data.results[0];

      expect(item.highlight.available).toBe(false);
      expect(item.highlight.services).toEqual([]);
    });
  });
});
