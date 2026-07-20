//apps/api/src/routes/catalog/genres.ts

import { Router } from "express";
import { getGenresController } from "@/controllers/catalog/genres";

const router = Router();

router.get("/", getGenresController);

export default router;
