// apps/api/src/services/profile/countries.ts

import prisma from "@/lib/prisma";
import { AppError } from "@/middleware/errorHandler";
import { getCountries } from "@/services/catalog/countries";
import { buildCountries } from "@/services/profile/profile";
import type { ProfileCountry } from "@foundit/types";

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

export async function removeUserCountry(
  userId: string,
  countryCode: string,
): Promise<ProfileCountry[]> {
  await prisma.$transaction([
    prisma.userStreamingService.deleteMany({ where: { userId, countryCode } }),
    prisma.userCountry.deleteMany({ where: { userId, countryCode } }),
  ]);
  return buildCountries(userId);
}
