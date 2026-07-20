// apps/api/src/routes/catalog/discover.ts  (tickets #36, #37)

import { Router } from "express";
import {
  discoverMoviesController,
  discoverSeriesController,
} from "@/controllers/catalog/discover";

const router = Router();

router.get("/movies", discoverMoviesController);
router.get("/series", discoverSeriesController);

export default router;
