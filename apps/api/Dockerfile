# Multi-stage build for apps/api inside the pnpm monorepo.
#
# IMPORTANT: the build context is the REPO ROOT, not apps/api — the api
# package depends on packages/types via a pnpm workspace symlink, and pnpm
# needs the root manifests (pnpm-lock.yaml, pnpm-workspace.yaml) to resolve
# it. On Render: leave "Root Directory" blank and set the Dockerfile path
# to ./apps/api/Dockerfile.

# ── Stage 1: build ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

# Prisma probes libssl to pick its engine, and TLS connections to Neon need
# the CA bundle. Without these, Prisma guesses the OpenSSL version and
# encrypted database connections can fail at runtime.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# The root package.json declares pnpm under devEngines rather than the
# `packageManager` field corepack reads, so pin the version explicitly here.
RUN npm install -g pnpm@11.18.0

WORKDIR /app
COPY . .

# `foundit-api...` (trailing dots) = the api package AND its workspace
# dependencies (packages/types). This deliberately excludes apps/web, whose
# postinstall (nuxt prepare) is irrelevant here and would slow the build.
# apps/api's own postinstall runs `prisma generate` — schema.prisma is
# already present because we copied the repo first.
RUN pnpm install --frozen-lockfile --filter foundit-api...

# esbuild bundles @foundit/types into dist/server.js; real npm dependencies
# stay external and are resolved from node_modules at runtime.
RUN pnpm --filter foundit-api build

# ── Stage 2: runtime ──────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Same as in the builder stage: needed both by `prisma migrate deploy` at
# startup and by the query engine when connecting to Neon over TLS.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
RUN npm install -g pnpm@11.18.0

WORKDIR /app

# Manifests only — enough for pnpm to rebuild a production-only node_modules
# and to recreate the packages/types symlink (nothing imports it at runtime,
# it's already bundled, but pnpm needs the directory to exist).
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/types/package.json packages/types/
COPY --from=builder /app/apps/api/package.json apps/api/

# Prisma schema + config must exist BEFORE install: apps/api's postinstall
# regenerates the Prisma client in this stage, and `migrate deploy` at
# startup reads both.
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts apps/api/

RUN pnpm install --prod --frozen-lockfile --filter foundit-api...

COPY --from=builder /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api

# Documentation only — Render injects its own PORT, which env.ts coerces.
EXPOSE 3001

# Migrations run on every container start (idempotent: migrate deploy only
# applies pending ones). cwd is /app/apps/api, so env.ts's lookup of
# ../../.env finds nothing and dotenv no-ops — env vars come from Render.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]