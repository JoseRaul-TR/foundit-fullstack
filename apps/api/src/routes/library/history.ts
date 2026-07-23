// apps/api/src/routes/library/history.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  getHistoryController,
  markMovieWatchedController,
  markSeasonWatchedController,
  unmarkMovieWatchedController,
  unmarkSeasonWatchedController,
} from "@/controllers/library/history";

const router = Router();

router.get("/", requireAuth, getHistoryController);
router.post("/movie", requireAuth, markMovieWatchedController);
router.delete("/movie/:tmdbId", requireAuth, unmarkMovieWatchedController);
router.post("/season", requireAuth, markSeasonWatchedController);
router.delete(
  "/season/:tmdbShowId/:seasonNumber",
  requireAuth,
  unmarkSeasonWatchedController,
);

export default router;
