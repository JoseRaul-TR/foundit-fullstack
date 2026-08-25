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

/** The one provider block the highlight and newSeasonsAvailable tests share. */
const NETFLIX_US = watchProviders("US", [
  { providerId: 8, name: "Netflix", logoPath: "/netflix.jpg" },
]);

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

  /**
   * Years and createdAt deliberately disagree, so each assertion below can
   * only pass if that specific sort is actually being applied and not just
   * DB insertion order. createdAt is set explicitly rather than relying on
   * three back-to-back creates landing in distinct milliseconds — they do
   * not: items landing in the same millisecond flaked this test before the
   * `id` tie-break existed.
   */
  async function seedSortFixture(userId: string) {
    await prisma.watchlistItem.createMany({
      data: [
        {
          userId,
          tmdbId: 1,
          mediaType: "movie",
          year: 2020,
          createdAt: new Date("2024-01-01T00:00:00Z"), // added 1st (oldest)
        },
        {
          userId,
          tmdbId: 2,
          mediaType: "movie",
          year: 1990,
          createdAt: new Date("2024-01-02T00:00:00Z"), // added 2nd
        },
        {
          userId,
          tmdbId: 3,
          mediaType: "movie",
          year: 2010,
          createdAt: new Date("2024-01-03T00:00:00Z"), // added 3rd (newest)
        },
      ],
    });
  }

  function ids(res: { body: { data: { results: { tmdbId: number }[] } } }) {
    return res.body.data.results.map((r) => r.tmdbId);
  }

  /**
   * One series on the watchlist, some of its seasons watched, and optionally
   * a Netflix US subscription — the three pieces newSeasonsAvailable reads.
   * The fourth (whether the show is still returning) comes from the TMDB
   * fixture each test declares for itself.
   */
  async function seedSeries(
    userId: string,
    watchedSeasons: number[],
    { subscribed = true } = {},
  ) {
    await prisma.watchlistItem.create({
      data: { userId, tmdbId: 1396, mediaType: "series", year: 2008 },
    });
    if (watchedSeasons.length > 0) {
      await prisma.watchedItem.createMany({
        data: watchedSeasons.map((seasonNumber) => ({
          userId,
          tmdbId: 1396,
          mediaType: "series",
          seasonNumber,
        })),
      });
    }
    if (subscribed) {
      await prisma.userStreamingService.create({
        data: { userId, providerId: 8, countryCode: "US" },
      });
    }
  }

  async function newSeasonsFlag(testUser: TestUser): Promise<boolean> {
    const res = await (await authed(testUser)).get(WATCHLIST_BASE);
    return res.body.data.results[0].newSeasonsAvailable;
  }

  describe("GET /watchlist", () => {
    it("returns paginated items with TMDB data", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          year: 1999,
        },
      });
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const res = await (await authed(testUser)).get(WATCHLIST_BASE);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.totalResults).toBe(1);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].tmdb.posterPath).toBe("/poster.jpg");
    });

    it("filters by type", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          year: 1999,
        },
      });
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 1396,
          mediaType: "series",
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

    it("sorts by year and added (default)", async () => {
      const testUser = await createTestUser();
      await seedSortFixture(testUser.id);
      mockedFetchTmdb.mockResolvedValue(movieFixture());
      const client = await authed(testUser);

      expect(ids(await client.get(`${WATCHLIST_BASE}?sort=added`))).toEqual([
        3, 2, 1,
      ]); // most recently added first
      expect(ids(await client.get(`${WATCHLIST_BASE}?sort=year`))).toEqual([
        1, 3, 2,
      ]); // 2020, 2010, 1990
    });

    it("reverses either sort with order=asc", async () => {
      const testUser = await createTestUser();
      await seedSortFixture(testUser.id);
      mockedFetchTmdb.mockResolvedValue(movieFixture());
      const client = await authed(testUser);

      expect(
        ids(await client.get(`${WATCHLIST_BASE}?sort=added&order=asc`)),
      ).toEqual([1, 2, 3]);
      expect(
        ids(await client.get(`${WATCHLIST_BASE}?sort=year&order=asc`)),
      ).toEqual([2, 3, 1]); // 1990, 2010, 2020
    });

    it("keeps items with no year last in both directions", async () => {
      // nulls: "last" is fixed rather than following the direction — an item
      // whose year is unknown belongs at the bottom either way, not at the
      // top of an ascending list.
      const testUser = await createTestUser();
      await prisma.watchlistItem.createMany({
        data: [
          { userId: testUser.id, tmdbId: 1, mediaType: "movie", year: 2020 },
          { userId: testUser.id, tmdbId: 2, mediaType: "movie", year: null },
        ],
      });
      mockedFetchTmdb.mockResolvedValue(movieFixture());
      const client = await authed(testUser);

      expect(ids(await client.get(`${WATCHLIST_BASE}?sort=year`))).toEqual([
        1, 2,
      ]);
      expect(
        ids(await client.get(`${WATCHLIST_BASE}?sort=year&order=asc`)),
      ).toEqual([1, 2]);
    });

    it("rejects the removed title sort", async () => {
      // z.enum(...).default() covers an absent parameter, not an invalid
      // one, so a retired value is rejected rather than silently falling
      // back to "added".
      const testUser = await createTestUser();
      const res = await (
        await authed(testUser)
      ).get(`${WATCHLIST_BASE}?sort=title`);
      expect(res.status).toBe(400);
    });

    it("highlights a subscribed service when the user has that provider", async () => {
      const testUser = await createTestUser();
      await prisma.watchlistItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          year: 1999,
        },
      });
      await prisma.userStreamingService.create({
        data: { userId: testUser.id, providerId: 8, countryCode: "US" },
      });
      mockedFetchTmdb.mockResolvedValue(
        movieFixture({ "watch/providers": NETFLIX_US }),
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
          year: 1999,
        },
      });
      // User is subscribed to a DIFFERENT provider than the one TMDB returns.
      await prisma.userStreamingService.create({
        data: { userId: testUser.id, providerId: 337, countryCode: "US" },
      });
      mockedFetchTmdb.mockResolvedValue(
        movieFixture({ "watch/providers": NETFLIX_US }),
      );

      const res = await (await authed(testUser)).get(WATCHLIST_BASE);
      const item = res.body.data.results[0];

      expect(item.highlight.available).toBe(false);
      expect(item.highlight.services).toEqual([]);
    });

    // newSeasonsAvailable had no coverage at all before #234 batched the
    // season lookup out of the per-row path. All four conditions are
    // asserted here so the compound condition cannot lose one silently.

    it("flags a returning series with an unwatched season on a subscribed service", async () => {
      const testUser = await createTestUser();
      await seedSeries(testUser.id, [1, 2]);
      mockedFetchTmdb.mockResolvedValue(
        seriesFixture({
          status: "Returning Series",
          "watch/providers": NETFLIX_US,
        }),
      );

      expect(await newSeasonsFlag(testUser)).toBe(true);
    });

    it("does not flag a series the user has never started", async () => {
      // The branch that changed shape: an absent map key, where it used to
      // be an empty array of watched seasons. A lookup defaulting to zero
      // instead of undefined would announce a new season to someone who has
      // watched nothing.
      const testUser = await createTestUser();
      await seedSeries(testUser.id, []);
      mockedFetchTmdb.mockResolvedValue(
        seriesFixture({
          status: "Returning Series",
          "watch/providers": NETFLIX_US,
        }),
      );

      expect(await newSeasonsFlag(testUser)).toBe(false);
    });

    it("does not flag a series that has ended", async () => {
      const testUser = await createTestUser();
      await seedSeries(testUser.id, [1, 2]);
      mockedFetchTmdb.mockResolvedValue(
        seriesFixture({ "watch/providers": NETFLIX_US }), // status: "Ended"
      );

      expect(await newSeasonsFlag(testUser)).toBe(false);
    });

    it("does not flag a new season the user cannot watch anywhere", async () => {
      const testUser = await createTestUser();
      await seedSeries(testUser.id, [1, 2], { subscribed: false });
      mockedFetchTmdb.mockResolvedValue(
        seriesFixture({
          status: "Returning Series",
          "watch/providers": NETFLIX_US,
        }),
      );

      expect(await newSeasonsFlag(testUser)).toBe(false);
    });
  });
});
