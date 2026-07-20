//apps/api/src/controllers/catalog/search.ts
/**
 * Public endpoint — no session lookup at all, unlike movies/series.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { searchTmdb, type SearchType } from "@/services/catalog/search";

const querySchema = z.object({
  q: z.string().min(3, "q must be at least 3 characters"),
  type: z.enum(["multi", "movie", "series", "person"]).default("multi"),
  lang: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export async function searchController(req: Request, res: Response) {
  // .parse() throws ZodError on empty/short/missing q -> 400 via errorHandler,
  // satisfying "GET /api/v1/search?q=&... returns 400 validation error".
  const { q, type, lang, page } = querySchema.parse(req.query);
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const data = await searchTmdb(q, type as SearchType, locale, page);

  res.json({ success: true, data });
}
