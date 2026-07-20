// apps/api/src/controllers/profile/countries.ts
/**
 * POST/DELETE return the user's updated country list rather than a bare
 * success flag, matching #45's PUT (return current state after a mutation).
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import {
  addUserCountry,
  listUserCountries,
  removeUserCountry,
} from "@/services/profile/countries";

const countryCodeSchema = z
  .string()
  .length(2, "countryCode must be a 2-letter ISO 3166-1 code")
  .toUpperCase();

const addCountrySchema = z.object({
  countryCode: countryCodeSchema,
});

const paramsSchema = z.object({
  code: countryCodeSchema,
});

export async function getUserCountriesController(req: Request, res: Response) {
  const userId = getUserId(req);
  const countries = await listUserCountries(userId);
  res.json({ success: true, data: countries });
}

export async function addUserCountryController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { countryCode } = addCountrySchema.parse(req.body);
  const countries = await addUserCountry(userId, countryCode);
  res.json({ success: true, data: countries });
}

export async function removeUserCountryController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { code } = paramsSchema.parse(req.params);
  const countries = await removeUserCountry(userId, code);
  res.json({ success: true, data: countries });
}
