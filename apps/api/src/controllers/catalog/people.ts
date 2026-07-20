// apps/api/src/controllers/catalog/people.ts

import type { Request, Response } from "express";
import { z } from "zod";
import {
  isLocale,
  type SupportedLocale,
  type PersonDetailResponse,
} from "@foundit/types";
import { getPersonDetail } from "@/services/catalog/people";

const paramsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a numeric string")
    .transform(Number),
});
const querySchema = z.object({ lang: z.string().optional() });

export async function getPersonDetailController(req: Request, res: Response) {
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const person = await getPersonDetail(tmdbId, locale);

  res.json({ success: true, data: person } satisfies {
    success: true;
    data: PersonDetailResponse;
  });
}
