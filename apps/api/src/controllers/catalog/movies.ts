// apps/api/src/controllers/catalog/movies.ts

import type { Request, Response } from "express";
import { z } from "zod";
import {
  isLocale,
  type SupportedLocale,
  type MovieDetailResponse,
} from "@foundit/types";
import { extractSession } from "@/lib/auth";
import { getMovieDetail } from "@/services/catalog/movies";

const paramsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a numeric string")
    .transform(Number),
});
const querySchema = z.object({ lang: z.string().optional() });

export async function getMovieDetailController(req: Request, res: Response) {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const user = await extractSession(req);
  const movie = await getMovieDetail(tmdbId, locale, user?.id ?? null);

  res.json({ success: true, data: movie } satisfies {
    success: true;
    data: MovieDetailResponse;
  });
}
