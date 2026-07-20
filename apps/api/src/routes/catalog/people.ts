// apps/api/src/routes/catalog/people.ts

import { Router } from "express";
import { getPersonDetailController } from "@/controllers/catalog/people";

const router = Router();

router.get("/:id", getPersonDetailController);

export default router;
