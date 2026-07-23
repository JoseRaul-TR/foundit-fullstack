// apps/api/src/routes/library/ratings.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  listRatingsController,
  removeRatingController,
  upsertRatingController,
} from "@/controllers/library/ratings";

const router = Router();

router.get("/", requireAuth, listRatingsController);
router.post("/", requireAuth, upsertRatingController);
router.delete("/:tmdbId/:mediaType", requireAuth, removeRatingController);

export default router;
