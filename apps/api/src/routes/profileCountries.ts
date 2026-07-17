// apps/api/src/routes/profileCountries.ts
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/middleware/errorHandler";
import type { ProfileCountry } from "@/services/profile";
import {
  addUserCountry,
  listUserCountries,
  removeUserCountry,
} from "@/services/profileCountries";
import { Router } from "express";
import z from "zod";

const router = Router();

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

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const countries = await listUserCountries(userId);

  res.json({ success: true, data: countries } satisfies {
    success: true;
    data: ProfileCountry[];
  });
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { countryCode } = addCountrySchema.parse(req.body);
  const countries = await addUserCountry(userId, countryCode);

  res.json({ success: true, data: countries } satisfies {
    success: true;
    data: ProfileCountry[];
  });
});

router.delete("/:code", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { code } = paramsSchema.parse(req.params);
  const countries = await removeUserCountry(userId, code);

  res.json({ success: true, data: countries } satisfies {
    success: true;
    data: ProfileCountry[];
  });
});

export default router;
