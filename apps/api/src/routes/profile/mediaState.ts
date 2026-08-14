// apps/api/src/routes/profile/mediaState.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import { getMediaStateController } from "@/controllers/profile/mediaState";

const router = Router();

router.get("/", requireAuth, getMediaStateController);

export default router;
