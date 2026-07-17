// apps/api/src/services/profileCountries.ts
import prisma from "@/lib/prisma";
import { AppError } from "@/middleware/errorHandler";
import { getCountries } from "@/services/countries";
import { buildCountries, type ProfileCountry } from "@/services/profile";

export async function listUserCountries(
  userId: string,
): Promise<ProfileCountry[]> {
  return buildCountries(userId);
}

async function assertValidCountryCode(countryCode: string): Promise<void> {
  const countries = await getCountries();
  const isValid = countries.some((country) => country.code === countryCode);
  if (!isValid) {
    throw new AppError("Invalid country code", 400);
  }
}

export async function addUserCountry(
  userId: string,
  countryCode: string,
): Promise<ProfileCountry[]> {
  await assertValidCountryCode(countryCode);

  await prisma.userCountry.upsert({
    where: { userId_countryCode: { userId, countryCode } },
    create: { userId, countryCode },
    update: {},
  });
  return buildCountries(userId);
}

/**
 * deleteMany (not delete) on both sides — removing a country the user
 * never had, or one with no saved services, is a no-op, not a 404. The
 * ticket doesn't ask for "country not found" as an error case.
 */
export async function removeUserCountry(
  userId: string,
  countryCode: string,
): Promise<ProfileCountry[]> {
  await prisma.$transaction([
    prisma.userStreamingService.deleteMany({
      where: { userId, countryCode },
    }),
    prisma.userCountry.deleteMany({
      where: { userId, countryCode },
    }),
  ]);

  return buildCountries(userId);
}
