// apps/api/src/routes/catalog/provider.ts

import { Router } from "express";
import { getProvidersController } from "@/controllers/catalog/providers";

const router = Router();

router.get("/", getProvidersController);

export default router;
