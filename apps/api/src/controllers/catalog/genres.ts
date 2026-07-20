// apps/api/src/controllers/catalog/genres.ts

import type { Request, Response } from "express";
import { z } from "zod";
import {
  isLocale,
  type SupportedLocale,
  type GenresResponse,
} from "@foundit/types";
import { getGenres } from "@/services/catalog/genres";

const querySchema = z.object({ lang: z.string().optional() });

export async function getGenresController(req: Request, res: Response) {
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";
  const genres = await getGenres(locale);
  res.json({ success: true, data: genres } satisfies {
    success: true;
    data: GenresResponse;
  });
}
