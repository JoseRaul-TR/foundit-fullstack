// apps/api/src/routes/library/watchlist.routes.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  addToWatchlistController,
  getWatchlistController,
  removeFromWatchlistController,
} from "@/controllers/library/watchlist";

const router = Router();

router.get("/", requireAuth, getWatchlistController);
router.post("/", requireAuth, addToWatchlistController);
router.delete(
  "/:tmdbId/:mediaType",
  requireAuth,
  removeFromWatchlistController,
);

export default router;
