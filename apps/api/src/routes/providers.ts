// apps/api/src/routes/providers.ts

import { getProviders, type ProviderItem } from "@/services/providers";
import { Router } from "express";
import z from "zod";

const router = Router();

const querySchema = z.object({
  region: z
    .string()
    .length(2, "region must be a 2-letter ISO 3166-1 code")
    .toUpperCase(),
});

router.get("/", async (req, res) => {
  const { region } = querySchema.parse(req.query);

  const providers = await getProviders(region);

  res.json({ success: true, data: providers } satisfies {
    success: true;
    data: ProviderItem[];
  });
});

export default router;
