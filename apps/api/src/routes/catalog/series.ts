// apps/api/src/routes/catalog/series.ts

import { Router } from "express";
import {
  getSeriesDetailController,
  getSeriesSeasonDetailController,
} from "@/controllers/catalog/series";

const router = Router();

router.get("/:id", getSeriesDetailController);
router.get("/:id/season/:n", getSeriesSeasonDetailController);

export default router;
