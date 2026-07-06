// apps/api/prisma.config.ts
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Resolver la ruta al .env de la raíz del monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations", // Ruta donde se guardarán las migraciones
  },
  datasource: {
    url: process.env.DATABASE_URL, // URL definida en el .env
  },
});
