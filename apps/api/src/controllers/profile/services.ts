// apps/api/src/controllers/profile/services.ts
/**
 * POST/DELETE return the updated services list, per the ticket's explicit
 * task ("Return updated list of services after POST/DELETE").
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import {
  addUserService,
  listUserServices,
  removeUserService,
} from "@/services/profile/services";

const countryCodeSchema = z
  .string()
  .length(2, "countryCode must be a 2-letter ISO 3166-1 code")
  .toUpperCase();

const addServiceSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  countryCode: countryCodeSchema,
});

const paramsSchema = z.object({
  providerId: z.coerce.number().int().positive(),
  countryCode: countryCodeSchema,
});

export async function getUserServicesController(req: Request, res: Response) {
  const userId = getUserId(req);
  const services = await listUserServices(userId);
  res.json({ success: true, data: services });
}

export async function addUserServiceController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { providerId, countryCode } = addServiceSchema.parse(req.body);
  const services = await addUserService(userId, providerId, countryCode);
  res.json({ success: true, data: services });
}

export async function removeUserServiceController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { providerId, countryCode } = paramsSchema.parse(req.params);
  const services = await removeUserService(userId, providerId, countryCode);
  res.json({ success: true, data: services });
}
