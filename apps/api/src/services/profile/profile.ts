// apps/api/src/services/profile/profile.ts

import prisma from "@/lib/prisma";
import { getCountries } from "@/services/catalog/countries";
import type {
  ProfileCountry,
  ProfileStreamingService,
  ProfileResponse,
} from "@foundit/types";
import { assertValidCountryCode } from "./countries";

export interface UpdateProfileInput {
  name?: string;
  ageRatingCountry?: string | null;
}

export async function buildCountries(
  userId: string,
): Promise<ProfileCountry[]> {
  const [userCountries, catalog] = await Promise.all([
    prisma.userCountry.findMany({ where: { userId } }),
    getCountries(),
  ]);
  const nameByCode = new Map(catalog.map((c) => [c.code, c.name]));
  return userCountries.map((uc) => ({
    code: uc.countryCode,
    name: nameByCode.get(uc.countryCode) ?? uc.countryCode,
  }));
}

export async function buildServices(
  userId: string,
): Promise<ProfileStreamingService[]> {
  const userServices = await prisma.userStreamingService.findMany({
    where: { userId },
  });
  if (userServices.length === 0) return [];

  const catalogEntries = await prisma.streamingService.findMany({
    where: {
      OR: userServices.map((s) => ({
        countryCode: s.countryCode,
        providerId: s.providerId,
      })),
    },
  });
  const catalogByKey = new Map(
    catalogEntries.map((entry) => [
      `${entry.countryCode}:${entry.providerId}`,
      entry,
    ]),
  );

  const services: ProfileStreamingService[] = [];
  for (const userService of userServices) {
    const catalogEntry = catalogByKey.get(
      `${userService.countryCode}:${userService.providerId}`,
    );
    if (!catalogEntry) continue;
    services.push({
      providerId: userService.providerId,
      name: catalogEntry.name,
      logoPath: catalogEntry.logoPath,
      countryCode: userService.countryCode,
    });
  }
  return services;
}

export async function getProfile(userId: string): Promise<ProfileResponse> {
  const [user, countries, services] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    buildCountries(userId),
    buildServices(userId),
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.image,
    createdAt: user.createdAt,
    countries,
    services,
    ageRatingCountry: user.ageRatingCountry,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfileResponse> {
  if (input.ageRatingCountry) {
    await assertValidCountryCode(input.ageRatingCountry);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.ageRatingCountry !== undefined
        ? { ageRatingCountry: input.ageRatingCountry }
        : {}),
    },
  });
  return getProfile(userId);
}
