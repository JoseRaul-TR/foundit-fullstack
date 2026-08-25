// apps/api/tests/mediaState.test.ts
/**
 *
 * clearCache() in beforeEach is not optional here: lib/cache.ts keeps its
 * entries in a module-level Map that survives between test cases, so without
 * it a series cached by one test decides the outcome of the next.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/lib/prisma";
import { clearCache } from "@/lib/cache";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { fetchTmdb } from "@/lib/tmdb";
import { seriesFixture } from "./fixtures/tmdb";

vi.mock("@/lib/tmdb", () => ({
  fetchTmdb: vi.fn(),
  fetchTmdbWithFallback: vi.fn(),
}));

const mockedFetchTmdb = vi.mocked(fetchTmdb);
const MEDIA_STATE = "/api/v1/profile/media-state";

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
  };
}

async function watchSeasons(
  userId: string,
  tmdbId: number,
  seasonNumbers: number[],
) {
  await prisma.watchedItem.createMany({
    data: seasonNumbers.map((seasonNumber) => ({
      userId,
      tmdbId,
      mediaType: "series",
      seasonNumber,
    })),
  });
}

describe("profile media state", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearCache();
    mockedFetchTmdb.mockReset();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get(MEDIA_STATE);
    expect(res.status).toBe(401);
  });

  it("returns watchlist identifiers and watched movies", async () => {
    const testUser = await createTestUser();
    await prisma.watchlistItem.create({
      data: {
        userId: testUser.id,
        tmdbId: 550,
        mediaType: "movie",
        year: 1999,
      },
    });
    await prisma.watchedItem.create({
      data: {
        userId: testUser.id,
        tmdbId: 27205,
        mediaType: "movie",
        seasonNumber: null,
      },
    });

    const res = await (await authed(testUser)).get(MEDIA_STATE);

    expect(res.status).toBe(200);
    expect(res.body.data.watchlist).toEqual([
      { tmdbId: 550, mediaType: "movie" },
    ]);
    expect(res.body.data.watchedMovies).toEqual([27205]);
    expect(res.body.data.watchedSeries).toEqual([]);
    // Movies never need TMDB.
    expect(mockedFetchTmdb).not.toHaveBeenCalled();
  });

  it("reports a partially watched series as partial", async () => {
    const testUser = await createTestUser();
    await watchSeasons(testUser.id, 1396, [1, 2]);
    mockedFetchTmdb.mockResolvedValue(
      seriesFixture({ id: 1396, status: "Ended", number_of_seasons: 5 }),
    );

    const res = await (await authed(testUser)).get(MEDIA_STATE);

    expect(res.body.data.watchedSeries).toEqual([
      { tmdbId: 1396, watchedSeasons: 2, totalSeasons: 5, state: "partial" },
    ]);
  });

  it("reports a fully watched, ended series as complete", async () => {
    const testUser = await createTestUser();
    await watchSeasons(testUser.id, 1396, [1, 2, 3, 4, 5]);
    mockedFetchTmdb.mockResolvedValue(
      seriesFixture({ id: 1396, status: "Ended", number_of_seasons: 5 }),
    );

    const res = await (await authed(testUser)).get(MEDIA_STATE);

    expect(res.body.data.watchedSeries[0].state).toBe("complete");
  });

  it("reports a fully watched, still-running series as upToDate", async () => {
    const testUser = await createTestUser();
    await watchSeasons(testUser.id, 1396, [1, 2, 3]);
    mockedFetchTmdb.mockResolvedValue(
      seriesFixture({
        id: 1396,
        status: "Returning Series",
        number_of_seasons: 3,
      }),
    );

    const res = await (await authed(testUser)).get(MEDIA_STATE);

    expect(res.body.data.watchedSeries[0].state).toBe("upToDate");
  });

  it("does not count specials towards the watched season total", async () => {
    const testUser = await createTestUser();
    // Season 0 is TMDB's specials bucket; number_of_seasons excludes it, so
    // counting it would make four seasons out of three look complete.
    await watchSeasons(testUser.id, 1396, [0, 1, 2]);
    mockedFetchTmdb.mockResolvedValue(
      seriesFixture({ id: 1396, status: "Ended", number_of_seasons: 3 }),
    );

    const res = await (await authed(testUser)).get(MEDIA_STATE);

    expect(res.body.data.watchedSeries[0].watchedSeasons).toBe(2);
    expect(res.body.data.watchedSeries[0].state).toBe("partial");
  });

  it("falls back to partial when TMDB is unreachable", async () => {
    const testUser = await createTestUser();
    await watchSeasons(testUser.id, 1396, [1, 2, 3]);
    mockedFetchTmdb.mockRejectedValue(new Error("TMDB unavailable"));

    const res = await (await authed(testUser)).get(MEDIA_STATE);

    expect(res.status).toBe(200);
    expect(res.body.data.watchedSeries).toEqual([
      { tmdbId: 1396, watchedSeasons: 3, totalSeasons: null, state: "partial" },
    ]);
  });

  it("serves the second request for the same series from the cache", async () => {
    const testUser = await createTestUser();
    await watchSeasons(testUser.id, 1396, [1]);
    mockedFetchTmdb.mockResolvedValue(
      seriesFixture({ id: 1396, status: "Ended", number_of_seasons: 5 }),
    );
    const client = await authed(testUser);

    await client.get(MEDIA_STATE);
    await client.get(MEDIA_STATE);

    expect(mockedFetchTmdb).toHaveBeenCalledTimes(1);
  });
});
