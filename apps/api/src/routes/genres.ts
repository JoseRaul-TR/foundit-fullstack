// apps/api/src/routes/genres.ts

import { getGenres, type GenresResponse } from "@/services/genres";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { Router } from "express";
import z from "zod";

const router = Router();

const querySchema = z.object({
  lang: z.string().optional(),
});

router.get("/", async (req, res) => {
  const { lang } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const genres = await getGenres(locale);

  res.json({ success: true, data: genres } satisfies {
    success: true;
    data: GenresResponse;
  });
});

export default router;