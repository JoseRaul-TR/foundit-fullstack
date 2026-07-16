// apps/api/src/routes/people.ts

import { getPersonDetail, type PersonDetailResponse } from "@/services/people";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const paramsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a numeric string")
    .transform(Number),
});

const querySchema = z.object({
  lang: z.string().optional(),
});

router.get("/:id", async (req, res) => {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);

  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const person = await getPersonDetail(tmdbId, locale);

  res.json({ success: true, data: person } satisfies {
    success: true;
    data: PersonDetailResponse;
  });
});

export default router;
