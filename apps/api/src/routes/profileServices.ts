// apps /api/src/routes/profileServices.ts

import { requireAuth } from "@/lib/auth";
import { AppError } from "@/middleware/errorHandler";
import type { ProfileStreamingService } from "@/services/profile";
import {
  addUserService,
  listUserServices,
  removeUserService,
} from "@/services/profileServices";
import { Router } from "express";
import z from "zod";

/**
 * All three routes require auth. POST/DELETE return the updated services
 * list, per the ticket's explicit task ("Return updated list of services
 * after POST/DELETE").
 */

const router = Router();

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

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const services = await listUserServices(userId);

  res.json({ success: true, data: services } satisfies {
    success: true;
    data: ProfileStreamingService[];
  });
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { providerId, countryCode } = addServiceSchema.parse(req.body);
  const services = await addUserService(userId, providerId, countryCode);

  res.json({ success: true, data: services } satisfies {
    success: true;
    data: ProfileStreamingService[];
  });
});

router.delete("/:providerId/:countryCode", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { providerId, countryCode } = paramsSchema.parse(req.params);
  const services = await removeUserService(userId, providerId, countryCode);

  res.json({ success: true, data: services } satisfies {
    success: true;
    data: ProfileStreamingService[];
  });
});

export default router;
