// apps/api/prisma/seed.ts
// Note: importing from ../src pulls in config/env (dotenv from monorepo root),
// the shared Prisma singleton and the Better Auth instance — no local setup needed.
import { auth } from "../src/lib/auth";
import prisma, { pool } from "../src/lib/prisma";

// ─── Test credentials (documented in DEVLOG) ─────────────────────────────────
// Better Auth requires passwords of at least 8 characters.
const TEST_USERS = [
  {
    email: "testuser1@foundit.dev",
    password: "test1234",
    name: "Test User 1",
  },
  {
    email: "testuser2@foundit.dev",
    password: "test5678",
    name: "Test User 2",
  },
] as const;

/**
 * Ensures a test user exists WITH working email/password credentials.
 *
 * Users must be created through Better Auth (auth.api.signUpEmail) so the
 * password hash (scrypt, salt:hash format) and the account row are correct
 * by construction — never insert hashes manually.
 *
 * Self-healing: legacy seed users created directly via prisma.user.create
 * have no credential account and cannot sign in. If one is found, it is
 * deleted (cascade removes its related data) and recreated properly.
 */
async function ensureUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existing) {
    const hasCredentials = existing.accounts.some(
      (account) => account.providerId === "credential",
    );
    if (hasCredentials) return existing;

    console.log(
      `♻️  Recreating legacy seed user without credentials: ${email}`,
    );
    await prisma.user.delete({ where: { email } }); // cascade cleans related data
  }

  await auth.api.signUpEmail({ body: { email, password, name } });

  // signUpEmail sets emailVerified: false — flip it for test users
  return prisma.user.update({
    where: { email },
    data: { emailVerified: true },
  });
}

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Users (via Better Auth, with credentials) ────────────────────────────
  const user1 = await ensureUser(
    TEST_USERS[0].email,
    TEST_USERS[0].password,
    TEST_USERS[0].name,
  );
  const user2 = await ensureUser(
    TEST_USERS[1].email,
    TEST_USERS[1].password,
    TEST_USERS[1].name,
  );

  console.log(`✅ Users: ${user1.email}, ${user2.email}`);

  // ─── Countries ────────────────────────────────────────────────────────────
  // User 1: ES + SE
  await prisma.userCountry.upsert({
    where: { userId_countryCode: { userId: user1.id, countryCode: "ES" } },
    update: {},
    create: { userId: user1.id, countryCode: "ES" },
  });
  await prisma.userCountry.upsert({
    where: { userId_countryCode: { userId: user1.id, countryCode: "SE" } },
    update: {},
    create: { userId: user1.id, countryCode: "SE" },
  });
  // User 2: DE
  await prisma.userCountry.upsert({
    where: { userId_countryCode: { userId: user2.id, countryCode: "DE" } },
    update: {},
    create: { userId: user2.id, countryCode: "DE" },
  });

  console.log("✅ Countries configured");

  // ─── Streaming Services ───────────────────────────────────────────────────
  // TMDB provider IDs (real values):
  // Netflix: 8 | Disney+: 337 | HBO Max: 1899 | Amazon Prime: 9 | Apple TV+: 350 | Paramount+: 531

  // User 1: Netflix + Disney+ in ES and SE
  const user1Services = [
    { providerId: 8, countryCode: "ES" }, // Netflix ES
    { providerId: 337, countryCode: "ES" }, // Disney+ ES
    { providerId: 8, countryCode: "SE" }, // Netflix SE
    { providerId: 337, countryCode: "SE" }, // Disney+ SE
  ];
  for (const service of user1Services) {
    await prisma.userStreamingService.upsert({
      where: {
        userId_providerId_countryCode: {
          userId: user1.id,
          providerId: service.providerId,
          countryCode: service.countryCode,
        },
      },
      update: {},
      create: { userId: user1.id, ...service },
    });
  }

  // User 2: Amazon Prime in DE
  await prisma.userStreamingService.upsert({
    where: {
      userId_providerId_countryCode: {
        userId: user2.id,
        providerId: 9,
        countryCode: "DE",
      },
    },
    update: {},
    create: { userId: user2.id, providerId: 9, countryCode: "DE" },
  });

  console.log("✅ Streaming services configured");

  // ─── Watchlist (User 1) ───────────────────────────────────────────────────
  // Real TMDB IDs:
  // Inception: 27205 | Interstellar: 157336 | The Dark Knight: 155 (movies)
  // Breaking Bad: 1396 | Stranger Things: 66732 (series)
  const watchlistItems = [
    { tmdbId: 27205, mediaType: "movie" },
    { tmdbId: 157336, mediaType: "movie" },
    { tmdbId: 155, mediaType: "movie" },
    { tmdbId: 1396, mediaType: "series" },
    { tmdbId: 66732, mediaType: "series" },
  ];
  for (const item of watchlistItems) {
    await prisma.watchlistItem.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId: user1.id,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
        },
      },
      update: {},
      create: { userId: user1.id, ...item },
    });
  }

  console.log("✅ Watchlist items created");

  // ─── Watch History (User 1) ───────────────────────────────────────────────
  // Upsert is not possible here: seasonNumber is nullable inside the compound
  // unique index, so we use findFirst + create instead.
  const watchedItems: {
    tmdbId: number;
    mediaType: string;
    seasonNumber: number | null;
  }[] = [
    { tmdbId: 550, mediaType: "movie", seasonNumber: null }, // Fight Club
    { tmdbId: 13, mediaType: "movie", seasonNumber: null }, // Forrest Gump
    { tmdbId: 1396, mediaType: "series", seasonNumber: 1 }, // Breaking Bad S1
  ];

  for (const item of watchedItems) {
    const existing = await prisma.watchedItem.findFirst({
      where: {
        userId: user1.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        seasonNumber: item.seasonNumber,
      },
    });
    if (!existing) {
      await prisma.watchedItem.create({
        data: {
          userId: user1.id,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          seasonNumber: item.seasonNumber,
        },
      });
    }
  }

  console.log("✅ Watch history created");

  // ─── Ratings (User 1) ─────────────────────────────────────────────────────
  await prisma.userRating.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId: user1.id,
        tmdbId: 550,
        mediaType: "movie",
      },
    },
    update: { rating: 8 },
    create: { userId: user1.id, tmdbId: 550, mediaType: "movie", rating: 8 },
  });
  await prisma.userRating.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId: user1.id,
        tmdbId: 13,
        mediaType: "movie",
      },
    },
    update: { rating: 7 },
    create: { userId: user1.id, tmdbId: 13, mediaType: "movie", rating: 7 },
  });

  console.log("✅ Ratings created");
  console.log("🌱 Seed completed successfully");
  console.log("\n🔑 Test credentials:");
  for (const u of TEST_USERS) {
    console.log(`   ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
