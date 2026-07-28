// apps/api/src/controllers/catalog/certifications.ts
import type { Request, Response } from "express";
import { z } from "zod";
import type { CertificationItem } from "@foundit/types";
import { getCertifications } from "@/services/catalog/certifications";

const querySchema = z.object({
  mediaType: z.enum(["movie", "series"]),
  region: z
    .string()
    .length(2, "region must be a 2-letter ISO 3166-1 code")
    .toUpperCase(),
});

export async function getCertificationsController(req: Request, res: Response) {
  const { mediaType, region } = querySchema.parse(req.query);
  const certifications = await getCertifications(mediaType, region);
  res.json({ success: true, data: certifications } satisfies {
    success: true;
    data: CertificationItem[];
  });
}
