// apps/api/src/routes/catalog/search.ts

import { Router } from "express";
import { searchController } from "@/controllers/catalog/search";

const router = Router();

router.get("/", searchController);

export default router;
