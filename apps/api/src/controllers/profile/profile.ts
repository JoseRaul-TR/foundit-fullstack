// apps/api/src/controllers/profile/profile.ts
/**
 * getUserId(req) throws AppError(401) internally if req.session is missing,
 * so no separate defensive check is needed here — requireAuth (wired in the
 * route) already guarantees a session exists before this runs in practice.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { getProfile, updateProfile } from "@/services/profile/profile";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  ageRatingCountry: z.string().nullable().optional(),
});

export async function getProfileController(req: Request, res: Response) {
  const userId = getUserId(req);
  const profile = await getProfile(userId);
  res.json({ success: true, data: profile });
}

export async function updateProfileController(req: Request, res: Response) {
  const userId = getUserId(req);
  const { name, ageRatingCountry } = updateProfileSchema.parse(req.body);
  const profile = await updateProfile(userId, { name, ageRatingCountry });
  res.json({ success: true, data: profile });
}
