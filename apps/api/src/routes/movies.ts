// apps/api/src/routes/movies.ts
/**
 * Auth is optional here (not requireAuth): the route works both signed-in
 * and signed-out, per the ticket's acceptance criteria. extractSession()
 * never throws — it just resolves to null when there's no session.
 */

import { Router } from "express";
import { z } from "zod";
import { isLocale, type SupportedLocale } from "@foundit/types";
import { extractSession } from "@/lib/auth";
import { getMovieDetail, type MovieDetailResponse } from "@/services/movies";

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
  // Both .parse() calls throw ZodError on invalid input; Express 5 forwards
  // the rejection to errorHandler automatically (see middleware/errorHandler.ts).
  const { id: tmdbId } = paramsSchema.parse(req.params);
  const { lang } = querySchema.parse(req.query);

  // Unknown/missing lang silently falls back to "en" rather than 400 —
  // there is no invalid-lang case, so we default instead of rejecting.
  const locale: SupportedLocale = lang && isLocale(lang) ? lang : "en";

  const user = await extractSession(req);
  const movie = await getMovieDetail(tmdbId, locale, user?.id ?? null);

  res.json({ success: true, data: movie } satisfies {
    success: true;
    data: MovieDetailResponse;
  });
});

export default router;
