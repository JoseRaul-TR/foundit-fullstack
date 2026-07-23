// apps/api/src/routes/catalog/countries.ts
import { Router } from "express";
import { getCountriesController } from "@/controllers/catalog/countries";

const router = Router();

router.get("/", getCountriesController);

export default router;
