// apps/api/src/routes/catalog/discover.ts  (tickets #36, #37)

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  discoverMoviesController,
  discoverSeriesController,
} from "@/controllers/catalog/discover";

const router = Router();

// Discover is personalized by definition — every one of its filters reads the
// user's profile or their watched history. Answering an anonymous caller with
// a generic feed was the same failure as #184 in another disguise: a request
// the code had no way to honour, answered as though it had.
router.use(requireAuth);

router.get("/movies", discoverMoviesController);
router.get("/series", discoverSeriesController);

export default router;
