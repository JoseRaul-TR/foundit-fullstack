// apps/api/src/index.ts
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Obtain the current directory (equivalent to __dirname in ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the .env from the monorepo's root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Continue with imports
import prisma from "./lib/prisma";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";

// Validate environment variables with Zod
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.url(),
  TMDB_API_KEY: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  FRONTEND_URL: z.url(),
});

// Validate and parse evironment variables
const env = envSchema.parse(process.env);

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
app.use(express.json());

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

// Middleware to handle 404 status errors
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

// Middleware to handle global errors
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
