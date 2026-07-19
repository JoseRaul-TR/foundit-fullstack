// apps/api/src/services/profileServices.ts

import prisma from "@/lib/prisma";
import { buildServices, type ProfileStreamingService } from "@/services/profile";
import { AppError } from "@/middleware/errorHandler";

/**
 * Two distinct validations, two distinct status codes:
 *  - countryCode not in the user's configured countries -> 400 (their own
 *    profile is missing a prerequisite step, same class of error as #46's
 *    "invalid country code")
 *  - providerId+countryCode not in the StreamingService catalog -> 404,
 *    per the ticket's explicit acceptance criterion. Checked as the
 *    compound (countryCode, providerId) pair, not providerId alone —
 *    catalog rows are per-country, so "Netflix" existing for ES doesn't
 *    mean it exists for SE.
 *
 * addUserService upserts rather than plain-create: not explicitly required
 * by this ticket (unlike #46's), but kept consistent with #46's "duplicate
 * is a no-op, not an error" behavior rather than surfacing a 409 for
 * re-adding the same subscription.
 */

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
      "Country not configured for this user. Add it via POST /api/profile/countries first.",
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

/**
 * deleteMany scoped by all three fields — removes only the subscription
 * for that exact (providerId, countryCode) pair, leaving e.g. Netflix/SE
 * untouched when deleting Netflix/ES. No-op (not a 404) if the user didn't
 * have that subscription, same reasoning as #46's country removal.
 */
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
