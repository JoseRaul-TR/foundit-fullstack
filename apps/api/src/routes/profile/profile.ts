// apps/api/src/routes/profile/profile.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  getProfileController,
  updateProfileController,
} from "@/controllers/profile/profile";

const router = Router();

router.get("/", requireAuth, getProfileController);
router.put("/", requireAuth, updateProfileController);

export default router;
