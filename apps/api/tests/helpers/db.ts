// apps/api/tests/helpers/db.ts
import prisma from "@/lib/prisma";

/**
 * Wipes all user-owned + auth data between tests, in FK-safe (child-first)
 * order. Deliberately leaves `streamingService` (the shared TMDB provider
 * catalog) untouched — it's global reference data, not per-test state.
 * Suites that need specific provider rows seed them directly (see
 * tests/fixtures/streamingServices.ts).
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.watchlistItem.deleteMany({}),
    prisma.watchedItem.deleteMany({}),
    prisma.userRating.deleteMany({}),
    prisma.userStreamingService.deleteMany({}),
    prisma.userCountry.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.verification.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}
