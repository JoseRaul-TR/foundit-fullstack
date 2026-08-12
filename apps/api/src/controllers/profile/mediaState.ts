// apps/api/src/controllers/profile/mediaState.ts

import type { Request, Response } from "express";
import { getUserId } from "@/lib/auth";
import { getMediaState } from "@/services/profile/mediaState";

export async function getMediaStateController(req: Request, res: Response) {
  const userId = getUserId(req);
  const data = await getMediaState(userId);
  res.json({ success: true, data });
}
