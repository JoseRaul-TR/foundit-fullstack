// apps/api/src/routes/series.ts

import { isLocale, type SupportedLocale } from "@foundit/types";
import { Router } from "express";
import { extractSession } from "src/lib/auth";
import {
  getSeriesDetail,
  type SeriesDetailResponse,
} from "src/services/series";
import z from "zod";

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

  const user = await extractSession(req);
  const series = await getSeriesDetail(tmdbId, locale, user?.id ?? null);

  res.json({ success: true, data: series } satisfies {
    success: true;
    data: SeriesDetailResponse;
  });
});

export default router;
