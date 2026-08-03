// apps/api/prisma.config.ts
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Resolves the route to .env of the monorepo's root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations", // Rute where the migrations will be saved
  },
  datasource: {
    url: process.env.DATABASE_URL, // URL defined in .env
  },
});
