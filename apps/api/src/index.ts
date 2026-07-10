// apps/api/src/index.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";
import { env } from "./config/env";
import { auth, requireAuth } from "./lib/auth";
import prisma from "./lib/prisma";

// Create the Express app
const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// IMPORTANT: Better Auth's handler must be mounted BEFORE express.json().
// It needs the raw, unparsed request body — if express.json() runs first,
// sign-up/sign-in requests will fail silently or with a body-parsing error.
// Express 5 (path-to-regexp v8) requires named wildcards: "*splat", not "*".
app.all("/api/auth/*splat", toNodeHandler(auth));

// JSON body parser for everything else, mounted after the auth handler
app.use(express.json());

// Protected Route Example
app.get("/api/protected", requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "You are authenticated!",
    user: req.session?.user,
  });
});

// Health Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }); 
});

// Root Endpoint
app.get("/", (req: Request, res: Response) => {
  res.send(
    `FoundIt API is running! LOCALE_TO_TMDB_LANG['es'] = ${LOCALE_TO_TMDB_LANG["es"]}`,
  );
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: "Not Found",
      code: "NOT_FOUND",
      statusCode: 404,
    },
  });
});

// Global errors handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: {
      message:
        env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    },
  });
});

// Test the connection to the database
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}

// Start Server
app.listen(env.PORT, async () => {
  await testDatabaseConnection();
  console.log(`API server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Frontend URL: ${env.FRONTEND_URL}`);
});
