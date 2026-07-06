// apps/api/prisma/seed.ts
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Users ────────────────────────────────────────────────────────────────
  const user1 = await prisma.user.upsert({
    where: { email: "testuser1@foundit.dev" },
    update: {},
    create: {
      id: "seed-user-1",
      email: "testuser1@foundit.dev",
      name: "Test User 1",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "testuser2@foundit.dev" },
    update: {},
    create: {
      id: "seed-user-2",
      email: "testuser2@foundit.dev",
      name: "Test User 2",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

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
  // Breaking Bad: 1396 | Stranger Things: 66732 (TV)
  const watchlistItems = [
    { tmdbId: 27205, mediaType: "movie" },
    { tmdbId: 157336, mediaType: "movie" },
    { tmdbId: 155, mediaType: "movie" },
    { tmdbId: 1396, mediaType: "tv" },
    { tmdbId: 66732, mediaType: "tv" },
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
  // 2 movies watched
  const watchedMovies: {
    tmdbId: number;
    mediaType: string;
    seasonNumber: number | null;
  }[] = [
    { tmdbId: 550, mediaType: "movie", seasonNumber: null }, // Fight Club
    { tmdbId: 13, mediaType: "movie", seasonNumber: null }, // Forrest Gump
  ];
  // 1 TV show — season 1 watched (Breaking Bad)
  const watchedTV: {
    tmdbId: number;
    mediaType: string;
    seasonNumber: number | null;
  }[] = [{ tmdbId: 1396, mediaType: "tv", seasonNumber: 1 }];

  for (const item of [...watchedMovies, ...watchedTV]) {
    const existing = await prisma.watchedItem.findFirst({
      where: {
        userId: user1.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        seasonNumber: item.seasonNumber ?? null,
      },
    });
    if (!existing) {
      await prisma.watchedItem.create({
        data: {
          userId: user1.id,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          seasonNumber: item.seasonNumber ?? null,
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
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
