//apps/api/src/controllers/catalog/countries.ts

import type { Request, Response } from "express";
import type { CountryItem } from "@foundit/types";
import { getCountries } from "@/services/catalog/countries";

export async function getCountriesController(_req: Request, res: Response) {
  const countries = await getCountries();
  res.json({ success: true, data: countries } satisfies {
    success: true;
    data: CountryItem[];
  });
}
