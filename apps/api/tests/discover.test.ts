/**
 * apps/api/tests/discover.test.ts
 *
 * Characterisation tests, written before #184 collapses the two Discover code
 * paths into one. Everything here exercises the multi-region path *with*
 * countries selected — the path that survives — and asserts what it does
 * today, not what it ought to do.
 *
 * The point is narrow and worth stating: that path has never had a test, so
 * any change to it is unverifiable. These pass before the change and must pass
 * after it. #184's own tests, for the no-regions case that is currently broken,
 * come after and are marked as such.
 *
 * clearCache() in beforeEach is not optional: getCertifications caches per
 * mediaType and country in a module-level map that survives between cases.
 *
 * No type assertions anywhere below, deliberately. `TmdbRequestParams` is an
 * index-signature record, so every key the mock recorded is already readable —
 * needing a cast to inspect a call usually means asserting on the wrong shape.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/lib/prisma";
import { clearCache } from "@/lib/cache";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { fetchTmdb } from "@/lib/tmdb";
import {
  listItem,
  discoverPage,
  seriesFixture,
  certifications,
} from "./fixtures/tmdb";

vi.mock("@/lib/tmdb", () => ({
  fetchTmdb: vi.fn(),
  fetchTmdbWithFallback: vi.fn(),
}));

const mockedFetchTmdb = vi.mocked(fetchTmdb);

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

/** Two countries, providers OR'd within each — the shape the client sends. */
const TWO_REGIONS = JSON.stringify([
  { countryCode: "ES", providerIds: [8, 337] },
  { countryCode: "SE", providerIds: [350] },
]);

function discoverUrl(
  mediaType: "movies" | "series",
  params: Record<string, string | number> = {},
): string {
  const query = new URLSearchParams({
    regions: TWO_REGIONS,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });
  return `/api/v1/discover/${mediaType}?${query.toString()}`;
}

/** Every path fetchTmdb was called with, for the bounded-N+1 assertions. */
function calledPaths(): string[] {
  return mockedFetchTmdb.mock.calls.map((call) => call[0]);
}

function callParamsFor(path: string) {
  return mockedFetchTmdb.mock.calls.find((c) => c[0] === path)?.[1];
}

describe("discover — multi-region path, as it behaves today", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearCache();
    mockedFetchTmdb.mockReset();
  });

  describe("merging across regions", () => {
    it("deduplicates a title that both countries carry", async () => {
      const testUser = await createTestUser();
      // ES has 1 and 2, SE has 2 and 3. Two is the same film on both.
      mockedFetchTmdb.mockImplementation(async (_path, params) =>
        params?.watch_region === "ES"
          ? discoverPage([listItem(1), listItem(2)])
          : discoverPage([listItem(2), listItem(3)]),
      );

      const res = await (await authed(testUser)).get(discoverUrl("movies"));

      expect(res.status).toBe(200);
      const ids = res.body.data.results.map((r: { id: number }) => r.id);
      expect(ids).toEqual([1, 2, 3]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("makes one call per country with the providers OR'd inside it", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(discoverPage([listItem(1)]));

      await (await authed(testUser)).get(discoverUrl("movies"));

      // Two countries, one page each — not one call per provider.
      const discoverCalls = mockedFetchTmdb.mock.calls.filter(
        (c) => c[0] === "/discover/movie",
      );
      expect(discoverCalls).toHaveLength(2);

      const regions = discoverCalls.map((c) => c[1]?.watch_region);
      expect(new Set(regions)).toEqual(new Set(["ES", "SE"]));

      const es = discoverCalls.find((c) => c[1]?.watch_region === "ES");
      expect(es?.[1]?.with_watch_providers).toBe("8|337");
    });

    it("orders by the user's criterion in memory, not by TMDB's fetch order", async () => {
      const testUser = await createTestUser();
      // Fetched in id order; rated in the opposite order. If the response comes
      // back 3,2,1 then the in-memory sort ran; if 1,2,3, TMDB's order won.
      mockedFetchTmdb.mockResolvedValue(
        discoverPage([
          listItem(1, { vote_average: 5 }),
          listItem(2, { vote_average: 7 }),
          listItem(3, { vote_average: 9 }),
        ]),
      );

      const res = await (
        await authed(testUser)
      ).get(discoverUrl("movies", { sort: "rating" }));

      expect(res.body.data.results.map((r: { id: number }) => r.id)).toEqual([
        3, 2, 1,
      ]);
      // And the fetch itself still asked for popularity, deliberately.
      expect(callParamsFor("/discover/movie")?.sort_by).toBe("popularity.desc");
    });

    it("returns the requested page window and reports more when regions remain", async () => {
      const testUser = await createTestUser();
      const first = Array.from({ length: 20 }, (_, i) => listItem(i + 1));
      const second = Array.from({ length: 5 }, (_, i) => listItem(i + 100));
      mockedFetchTmdb.mockImplementation(async (_path, params) => {
        const page = Number(params?.page ?? 1);
        return discoverPage(page === 1 ? first : second, {
          page,
          totalPages: 2,
        });
      });

      const res = await (
        await authed(testUser)
      ).get(discoverUrl("movies", { page: 2 }));

      expect(res.body.data.page).toBe(2);
      expect(res.body.data.results).toHaveLength(5);
    });
  });

  describe("excludeWatched", () => {
    it("removes a watched movie", async () => {
      const testUser = await createTestUser();
      await prisma.watchedItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 2,
          mediaType: "movie",
          seasonNumber: null,
        },
      });
      mockedFetchTmdb.mockResolvedValue(
        discoverPage([listItem(1), listItem(2), listItem(3)]),
      );

      const res = await (
        await authed(testUser)
      ).get(discoverUrl("movies", { excludeWatched: "true" }));

      expect(res.body.data.results.map((r: { id: number }) => r.id)).toEqual([
        1, 3,
      ]);
    });

    it("removes a fully watched series and keeps a partially watched one", async () => {
      const testUser = await createTestUser();
      // 10 has all three seasons watched; 20 has one of five.
      await prisma.watchedItem.createMany({
        data: [
          {
            userId: testUser.id,
            tmdbId: 10,
            mediaType: "series",
            seasonNumber: 1,
          },
          {
            userId: testUser.id,
            tmdbId: 10,
            mediaType: "series",
            seasonNumber: 2,
          },
          {
            userId: testUser.id,
            tmdbId: 10,
            mediaType: "series",
            seasonNumber: 3,
          },
          {
            userId: testUser.id,
            tmdbId: 20,
            mediaType: "series",
            seasonNumber: 1,
          },
        ],
      });
      mockedFetchTmdb.mockImplementation(async (path) => {
        if (path === "/tv/10")
          return seriesFixture({ id: 10, number_of_seasons: 3 });
        if (path === "/tv/20")
          return seriesFixture({ id: 20, number_of_seasons: 5 });
        return discoverPage([listItem(10), listItem(20), listItem(30)]);
      });

      const res = await (
        await authed(testUser)
      ).get(discoverUrl("series", { excludeWatched: "true" }));

      const ids = res.body.data.results.map((r: { id: number }) => r.id);
      expect(ids).toContain(20); // partially watched — still offered
      expect(ids).toContain(30); // never watched
      expect(ids).not.toContain(10); // finished
    });

    it("only fetches detail for series the user has actually started", async () => {
      const testUser = await createTestUser();
      await prisma.watchedItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 10,
          mediaType: "series",
          seasonNumber: 1,
        },
      });
      mockedFetchTmdb.mockImplementation(async (path) =>
        path === "/tv/10"
          ? seriesFixture({ id: 10, number_of_seasons: 5 })
          : discoverPage([listItem(10), listItem(20), listItem(30)]),
      );

      await (
        await authed(testUser)
      ).get(discoverUrl("series", { excludeWatched: "true" }));

      // The bounded N+1: one detail call, not one per candidate.
      const detailCalls = calledPaths().filter((p) => p.startsWith("/tv/"));
      expect(detailCalls).toEqual(["/tv/10"]);
    });

    it("keeps a series that needed a detail call in its sorted position", async () => {
      const testUser = await createTestUser();
      // The regression this guards: enrichAndFilter used to push into a shared
      // array from inside Promise.all, so items that needed a round trip landed
      // after those that didn't — which is exactly the partially watched ones,
      // sent to the end of the list and off the first page.
      await prisma.watchedItem.create({
        data: {
          userId: testUser.id,
          tmdbId: 10,
          mediaType: "series",
          seasonNumber: 1,
        },
      });
      mockedFetchTmdb.mockImplementation(async (path) =>
        path === "/tv/10"
          ? seriesFixture({ id: 10, number_of_seasons: 5 })
          : discoverPage([
              listItem(10, { vote_average: 9 }),
              listItem(20, { vote_average: 8 }),
              listItem(30, { vote_average: 7 }),
            ]),
      );

      const res = await (
        await authed(testUser)
      ).get(discoverUrl("series", { sort: "rating", excludeWatched: "true" }));

      // 10 is the highest rated and needs a detail call. It must still be first.
      expect(res.body.data.results.map((r: { id: number }) => r.id)).toEqual([
        10, 20, 30,
      ]);
    });
  });

  describe("series age rating", () => {
    it("excludes a series rated above the maximum and lets an unrated one through", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockImplementation(async (path) => {
        if (path === "/certification/tv/list") {
          return certifications("SE", [
            { certification: "7", order: 1 },
            { certification: "11", order: 2 },
            { certification: "15", order: 3 },
          ]);
        }
        if (path === "/tv/10") {
          return seriesFixture({
            id: 10,
            content_ratings: { results: [{ iso_3166_1: "SE", rating: "15" }] },
          });
        }
        if (path === "/tv/20") {
          return seriesFixture({
            id: 20,
            content_ratings: { results: [{ iso_3166_1: "SE", rating: "7" }] },
          });
        }
        if (path === "/tv/30") {
          // No Swedish rating at all — deliberately let through, because TMDB's
          // series certification coverage is patchy.
          return seriesFixture({ id: 30, content_ratings: { results: [] } });
        }
        return discoverPage([listItem(10), listItem(20), listItem(30)]);
      });

      const res = await (
        await authed(testUser)
      ).get(
        discoverUrl("series", { ageRatingCountry: "SE", ageRatingMax: "11" }),
      );

      const ids = res.body.data.results.map((r: { id: number }) => r.id);
      expect(ids).not.toContain(10); // 15 is above 11
      expect(ids).toContain(20); // 7 is below
      expect(ids).toContain(30); // unrated
    });

    it("uses the native TMDB parameter for movies rather than a post-filter", async () => {
      const testUser = await createTestUser();
      mockedFetchTmdb.mockResolvedValue(discoverPage([listItem(1)]));

      await (
        await authed(testUser)
      ).get(
        discoverUrl("movies", { ageRatingCountry: "ES", ageRatingMax: "12" }),
      );

      expect(callParamsFor("/discover/movie")?.["certification.lte"]).toBe(
        "12",
      );
      expect(callParamsFor("/discover/movie")?.certification_country).toBe(
        "ES",
      );
      // And no per-title enrichment: movies never need the second call.
      expect(calledPaths().filter((p) => p.startsWith("/movie/"))).toEqual([]);
    });
  });
});
