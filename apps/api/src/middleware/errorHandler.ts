// apps/api/middleware/errorHandler.ts

import { Response, Request, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env";

// ─── AppError ─────────────────────────────────────────────────────────────────
const DEFAULT_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_ERROR",
};

/**
 * Operational errors: expected failures we throw deliberately from
 * controllers/services (not found, forbidden, conflict...). The error
 * handler trusts their message and statusCode. Non-operational errors
 * (bugs, unknown throws) always become a generic 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    sstatusCode: number,
    code?: string,
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = sstatusCode;
    this.code = code ?? DEFAULT_CODES[sstatusCode] ?? "INTERNAL_ERROR";
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Response helper ──────────────────────────────────────────────────────────
interface FieldError {
  field: string;
  message: string;
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: FieldError[],
) {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      statusCode,
      ...(details && details.length > 0 ? { details } : {}),
    },
  });
}

// ─── 404 handler ──────────────────────────────────────────────────────────────
/**
 * Catches requests that matched no route. Forwards an AppError so that
 * ALL error responses are formatted in exactly one place: errorHandler.
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
}

// ─── Central error handler ────────────────────────────────────────────────────
/**
 * Must be registered LAST in the middleware chain. Express identifies it
 * as an error handler by its 4-argument signature — keep `next` even if
 * unused. Express 5 forwards rejected promises from async handlers here
 * automatically (no asyncHandler wrapper needed).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 1. Zod validation errors → 400 with field-level details
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      details,
    );
  }

  // 2. Known Prisma errors → mapped status codes
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? ` on: ${(err.meta.target as string[]).join(", ")}`
        : "";
      return sendError(
        res,
        409,
        "CONFLICT",
        `Resource already exists${target}`,
      );
    }
    if (err.code === "P2025") {
      return sendError(res, 404, "NOT_FOUND", "Resource not found");
    }
    // Any other Prisma error is unexpected → fall through to 500
  }

  // 3. Own operational errors → trusted as-is
  if (err instanceof AppError && err.isOperational) {
    return sendError(res, err.statusCode, err.code, err.message);
  }

  // 4. Unknown / non-operational → 500, details hidden in production
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(
    `[${new Date().toISOString()}] Unhandled error on ${req.method} ${req.path}`,
  );
  console.error(error.stack ?? error.message);

  return sendError(
    res,
    500,
    "INTERNAL_ERROR",
    env.NODE_ENV === "production" ? "Internal Server Error" : error.message,
  );
}
