// apps/api/src/routes/profile/countries.ts

import { Router } from "express";
import { requireAuth } from "@/lib/auth";
import {
  addUserCountryController,
  getUserCountriesController,
  removeUserCountryController,
} from "@/controllers/profile/countries";

const router = Router();

router.get("/", requireAuth, getUserCountriesController);
router.post("/", requireAuth, addUserCountryController);
router.delete("/:code", requireAuth, removeUserCountryController);

export default router;
