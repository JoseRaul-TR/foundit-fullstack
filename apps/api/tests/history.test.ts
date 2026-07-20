/**
 * apps/api/tests/history.test.ts  (tickets #49 + #50)
 *
 * TMDB fully mocked via vi.mock("@/lib/tmdb") — both fetchBasicMediaInfo()
 * (movie history) and fetchMediaRaw() (series history) call through to
 * fetchTmdb() internally, so mocking fetchTmdb covers every enrichment
 * call here, same as #52/#53.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/lib/prisma";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { fetchTmdb } from "@/lib/tmdb";
import { movieFixture, seriesFixture } from "./fixtures/tmdb";

vi.mock("@/lib/tmdb", () => ({
  fetchTmdb: vi.fn(),
  fetchTmdbWithFallback: vi.fn(),
}));

const mockedFetchTmdb = vi.mocked(fetchTmdb);
const HISTORY_BASE = "/api/v1/history";

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

describe("history integration (#49 + #50)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedFetchTmdb.mockReset();
  });

  describe("POST /history/movie", () => {
    it("marks a movie as watched", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      const res = await (await authed(testUser))
        .post(`${HISTORY_BASE}/movie`)
        .send({ tmdbId: 550 });

      expect(res.status).toBe(200);
      expect(res.body.data.tmdbId).toBe(550);
      expect(res.body.data.tmdb.title).toBe("Fight Club");

      const row = await prisma.watchedItem.findFirst({
        where: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          seasonNumber: null,
        },
      });
      expect(row).not.toBeNull();
    });

    it("re-marking updates the timestamp instead of creating a duplicate", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(movieFixture());

      // Seed an "old" watched entry directly, bypassing the endpoint, so we
      // can prove re-marking bumps createdAt rather than just being a no-op.
      const oldDate = new Date("2020-01-01T00:00:00Z");
      await prisma.watchedItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          seasonNumber: null,
          createdAt: oldDate,
        },
      });

      const res = await (await authed(testUser))
        .post(`${HISTORY_BASE}/movie`)
        .send({ tmdbId: 550 });
      expect(res.status).toBe(200);

      const count = await prisma.watchedItem.count({
        where: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          seasonNumber: null,
        },
      });
      expect(count).toBe(1); // no duplicate row

      const row = await prisma.watchedItem.findFirst({
        where: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          seasonNumber: null,
        },
      });
      expect(row!.createdAt.getTime()).toBeGreaterThan(oldDate.getTime()); // timestamp bumped
    });
  });

  describe("DELETE /history/movie/:tmdbId", () => {
    it("removes a movie from history", async () => {
      const testUser = await createTestUser();
      await prisma.watchedItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          seasonNumber: null,
        },
      });

      const res = await (
        await authed(testUser)
      ).delete(`${HISTORY_BASE}/movie/550`);
      expect(res.status).toBe(200);

      const row = await prisma.watchedItem.findFirst({
        where: {
          userId: testUser.id,
          tmdbId: 550,
          mediaType: "movie",
          seasonNumber: null,
        },
      });
      expect(row).toBeNull();
    });
  });

  describe("POST /history/season", () => {
    it("marks a specific season as watched", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(seriesFixture());

      const res = await (await authed(testUser))
        .post(`${HISTORY_BASE}/season`)
        .send({
          tmdbShowId: 1396,
          seasonNumber: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.tmdbId).toBe(1396);
      expect(res.body.data.watchedSeasons).toEqual([1]);

      const row = await prisma.watchedItem.findFirst({
        where: {
          userId: testUser.id,
          tmdbId: 1396,
          mediaType: "series",
          seasonNumber: 1,
        },
      });
      expect(row).not.toBeNull();
    });

    it("groups multiple watched seasons of the same show in the GET response", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(seriesFixture());
      const client = await authed(testUser);

      await client
        .post(`${HISTORY_BASE}/season`)
        .send({ tmdbShowId: 1396, seasonNumber: 1 });
      await client
        .post(`${HISTORY_BASE}/season`)
        .send({ tmdbShowId: 1396, seasonNumber: 2 });
      await client
        .post(`${HISTORY_BASE}/season`)
        .send({ tmdbShowId: 1396, seasonNumber: 3 });

      const res = await client.get(`${HISTORY_BASE}?type=series`);

      expect(res.status).toBe(200);
      // One grouped entry per show, not one row per season.
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].tmdbId).toBe(1396);
      expect(res.body.data.results[0].watchedSeasons).toEqual([1, 2, 3]);
    });
  });

  describe("GET /history?type=series", () => {
    it("groups seasons by show and returns the correct watchedSeasons array", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockImplementation(async (path: string) =>
        path === "/tv/1396"
          ? seriesFixture({ id: 1396, name: "Breaking Bad" })
          : seriesFixture({ id: 66732, name: "Stranger Things" }),
      );
      const client = await authed(testUser);

      // Show A: seasons 1 and 3 watched (2 deliberately skipped).
      await client
        .post(`${HISTORY_BASE}/season`)
        .send({ tmdbShowId: 1396, seasonNumber: 1 });
      await client
        .post(`${HISTORY_BASE}/season`)
        .send({ tmdbShowId: 1396, seasonNumber: 3 });
      // Show B: only season 1 watched.
      await client
        .post(`${HISTORY_BASE}/season`)
        .send({ tmdbShowId: 66732, seasonNumber: 1 });

      const res = await client.get(`${HISTORY_BASE}?type=series`);

      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(2);

      const byId: Record<number, { watchedSeasons: number[] }> =
        Object.fromEntries(
          res.body.data.results.map(
            (r: { tmdbId: number; watchedSeasons: number[] }) => [r.tmdbId, r],
          ),
        );
      expect(byId[1396].watchedSeasons).toEqual([1, 3]);
      expect(byId[66732].watchedSeasons).toEqual([1]);
    });
  });
});
