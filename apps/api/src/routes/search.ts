// apps/api/src/routes/search.ts
import { Router } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { searchTmdb, type SearchType } from "src/services/search";

const router = Router();

const querySchema = z.object({
  q: z.string().min(3, "q must be at least 3 characters"),
  type: z.enum(["multi", "movie", "series", "person"]).default("multi"),
  lang: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

router.get("/", async (req, res) => {
  // .parse() throws ZodError on empty/short/missing q -> 400 via errorHandler,
  // satisfying "GET /api/search?q=&... returns 400 validation error".
  const { q, type, lang, page } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const data = await searchTmdb(q, type as SearchType, locale, page);

  res.json({ success: true, data });
});

export default router;
