// apps/api/src/types/express.d.ts
import type { AuthSession } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      session?: AuthSession;
    }
  }
}

export {};
