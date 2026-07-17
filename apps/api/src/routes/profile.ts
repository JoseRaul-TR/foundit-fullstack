// apps/api/src/routes/profile.ts

import { requireAuth } from "@/lib/auth";
import { AppError } from "@/middleware/errorHandler";
import { getProfile, updateProfile, type ProfileResponse } from "@/services/profile";
import { Router } from "express";
import z from "zod";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const profile = await getProfile(userId);

  res.json({ success: true, data: profile } satisfies {
    success: true;
    data: ProfileResponse;
  });
});

router.put("/", requireAuth, async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const { name } = updateProfileSchema.parse(req.body);
  const profile = await updateProfile(userId, { name });

  res.json({ success: true, data: profile } satisfies {
    success: true;
    data: ProfileResponse;
  });
});

export default router;