// apps/api/src/routes/catalog/series.ts

import { Router } from "express";
import {
  getSeriesDetailController,
  getSeriesRecommendationsController,
  getSeriesSeasonDetailController,
} from "@/controllers/catalog/series";

const router = Router();

router.get("/:id/recommendations", getSeriesRecommendationsController);
router.get("/:id/season/:n", getSeriesSeasonDetailController);
router.get("/:id", getSeriesDetailController);

export default router;
