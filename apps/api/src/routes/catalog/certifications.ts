// apps/api/src/routes/catalog/certifications.ts
import { Router } from "express";
import { getCertificationsController } from "@/controllers/catalog/certifications";

const router = Router();

router.get("/", getCertificationsController);

export default router;
