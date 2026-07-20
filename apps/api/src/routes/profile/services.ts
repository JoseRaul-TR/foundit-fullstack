// apps/api/src/routes/profile/services.routes.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  addUserServiceController,
  getUserServicesController,
  removeUserServiceController,
} from "@/controllers/profile/services";

const router = Router();

router.get("/", requireAuth, getUserServicesController);
router.post("/", requireAuth, addUserServiceController);
router.delete(
  "/:providerId/:countryCode",
  requireAuth,
  removeUserServiceController,
);

export default router;
