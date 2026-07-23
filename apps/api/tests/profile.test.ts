/**
 * apps/api/tests/profile.test.ts  (ticket #122)
 *
 * getCountries() (used by both buildCountries() and
 * assertValidCountryCode()) is mocked at the service level rather than
 * mocking @/lib/tmdb directly — profile tests care about profile/country
 * validation logic, not how the country catalog itself is fetched, which
 * is presumably covered by its own dedicated test suite.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/lib/prisma";
import { resetDatabase } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/auth";
import { getCountries } from "@/services/catalog/countries";

vi.mock("@/services/catalog/countries", () => ({
  getCountries: vi.fn(),
}));

const mockedGetCountries = vi.mocked(getCountries);
const PROFILE_BASE = "/api/v1/profile";

const COUNTRY_CATALOG = [
  { code: "SE", name: "Sweden", nativeName: "Sverige" },
  { code: "ES", name: "Spain", nativeName: "España" },
  { code: "US", name: "United States", nativeName: "United States" },
];

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
    put: (path: string) =>
      request(app)
        .put(path)
        .set("X-Forwarded-For", ip)
        .set("Cookie", testUser.cookie),
  };
}

describe("profile integration (#122)", () => {
  beforeEach(async () => {
    await resetDatabase();
    mockedGetCountries.mockReset();
    mockedGetCountries.mockResolvedValue(COUNTRY_CATALOG);
  });

  describe("GET /profile", () => {
    it("defaults ageRatingCountry to null", async () => {
      const testUser = await createTestUser();

      const res = await (await authed(testUser)).get(PROFILE_BASE);

      expect(res.status).toBe(200);
      expect(res.body.data.ageRatingCountry).toBeNull();
    });

    it("returns 401 without auth", async () => {
      const res = await request(app).get(PROFILE_BASE);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /profile", () => {
    it("sets ageRatingCountry to a valid country code", async () => {
      const testUser = await createTestUser();

      const res = await (await authed(testUser))
        .put(PROFILE_BASE)
        .send({ ageRatingCountry: "SE" });

      expect(res.status).toBe(200);
      expect(res.body.data.ageRatingCountry).toBe("SE");

      const row = await prisma.user.findUniqueOrThrow({
        where: { id: testUser.id },
      });
      expect(row.ageRatingCountry).toBe("SE");
    });

    it("persists across subsequent requests", async () => {
      const testUser = await createTestUser();
      const client = await authed(testUser);

      await client.put(PROFILE_BASE).send({ ageRatingCountry: "ES" });
      const res = await client.get(PROFILE_BASE);

      expect(res.body.data.ageRatingCountry).toBe("ES");
    });

    it("does not affect the countries multi-select", async () => {
      const testUser = await createTestUser();
      await prisma.userCountry.create({
        data: { userId: testUser.id, countryCode: "US" },
      });
      const client = await authed(testUser);

      await client.put(PROFILE_BASE).send({ ageRatingCountry: "SE" });
      const res = await client.get(PROFILE_BASE);

      // countries (multi-select) is untouched by setting ageRatingCountry
      // (single-select) — the two are independent, per #122's acceptance
      // criteria.
      expect(res.body.data.countries).toEqual([
        { code: "US", name: "United States" },
      ]);
      expect(res.body.data.ageRatingCountry).toBe("SE");
    });

    it("clears ageRatingCountry when explicitly set to null", async () => {
      const testUser = await createTestUser();
      const client = await authed(testUser);

      await client.put(PROFILE_BASE).send({ ageRatingCountry: "SE" });
      const res = await client
        .put(PROFILE_BASE)
        .send({ ageRatingCountry: null });

      expect(res.status).toBe(200);
      expect(res.body.data.ageRatingCountry).toBeNull();
    });

    it("returns 400 for an invalid country code", async () => {
      const testUser = await createTestUser();

      const res = await (await authed(testUser))
        .put(PROFILE_BASE)
        .send({ ageRatingCountry: "ZZ" });

      expect(res.status).toBe(400);
    });

    it("leaves ageRatingCountry untouched when omitted from the body", async () => {
      const testUser = await createTestUser();
      const client = await authed(testUser);

      await client.put(PROFILE_BASE).send({ ageRatingCountry: "SE" });
      const res = await client.put(PROFILE_BASE).send({ name: "New Name" });

      expect(res.status).toBe(200);
      expect(res.body.data.ageRatingCountry).toBe("SE");
      expect(res.body.data.name).toBe("New Name");
    });

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put(PROFILE_BASE)
        .send({ ageRatingCountry: "SE" });
      expect(res.status).toBe(401);
    });
  });
});
