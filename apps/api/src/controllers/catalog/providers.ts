// apps/api/src/controllers/catalog/providers.ts

import type { Request, Response } from "express";
import { z } from "zod";
import type { ProviderItem } from "@foundit/types";
import { getProviders } from "@/services/catalog/providers";

const querySchema = z.object({
  region: z
    .string()
    .length(2, "region must be a 2-letter ISO 3166-1 code")
    .toUpperCase(),
});

export async function getProvidersController(req: Request, res: Response) {
  const { region } = querySchema.parse(req.query);
  const providers = await getProviders(region);
  res.json({ success: true, data: providers } satisfies {
    success: true;
    data: ProviderItem[];
  });
}
