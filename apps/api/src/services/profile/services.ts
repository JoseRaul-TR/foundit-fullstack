// apps/api/src/services/profile/services.ts

import prisma from "@/lib/prisma";
import { buildServices } from "@/services/profile/profile";
import { AppError } from "@/middleware/errorHandler";
import type { ProfileStreamingService } from "@foundit/types";

export async function listUserServices(
  userId: string,
): Promise<ProfileStreamingService[]> {
  return buildServices(userId);
}

async function assertCountryConfigured(
  userId: string,
  countryCode: string,
): Promise<void> {
  const userCountry = await prisma.userCountry.findUnique({
    where: { userId_countryCode: { userId, countryCode } },
  });
  if (!userCountry) {
    throw new AppError(
      "Country not configured for this user. Add it via POST /api/v1/profile/countries first.",
      400,
    );
  }
}

async function assertServicesExists(
  providerId: number,
  countryCode: string,
): Promise<void> {
  const catalogEntry = await prisma.streamingService.findUnique({
    where: { countryCode_providerId: { countryCode, providerId } },
  });
  if (!catalogEntry) {
    throw new AppError("Streaming service not found", 404);
  }
}

export async function addUserService(
  userId: string,
  providerId: number,
  countryCode: string,
): Promise<ProfileStreamingService[]> {
  await assertCountryConfigured(userId, countryCode);
  await assertServicesExists(providerId, countryCode);
  await prisma.userStreamingService.upsert({
    where: {
      userId_providerId_countryCode: { userId, providerId, countryCode },
    },
    create: { userId, providerId, countryCode },
    update: {},
  });
  return buildServices(userId);
}

export async function removeUserService(
  userId: string,
  providerId: number,
  countryCode: string,
): Promise<ProfileStreamingService[]> {
  await prisma.userStreamingService.deleteMany({
    where: { userId, providerId, countryCode },
  });
  return buildServices(userId);
}
