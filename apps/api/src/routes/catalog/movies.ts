// apps/api/src/routes/catalog/movies.ts

import { Router } from "express";
import {
  getMovieDetailController,
  getMovieRecommendationsController,
} from "@/controllers/catalog/movies";

const router = Router();

router.get("/:id/recommendations", getMovieRecommendationsController);
router.get("/:id", getMovieDetailController);

export default router;
