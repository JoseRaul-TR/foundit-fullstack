// apps/api/src/routes/countries.ts

import { getCountries, type CountryItem } from "@/services/countries";
import { Router } from "express";

const router = Router();

router.get("/", async (_req, res) => {
  const countries = await getCountries();

  res.json({ success: true, data: countries } satisfies {
    success: true;
    data: CountryItem[];
  });
});

export default router;
