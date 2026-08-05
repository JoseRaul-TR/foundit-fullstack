# Multi-stage build for the whole monorepo: one image that serves both the
# Express API and the Nuxt frontend from a single origin (see #26 — that's
# what keeps Better Auth's session cookie first-party).
#
# Lives at the repo root because the build context is the root: apps/api
# depends on packages/types through a pnpm workspace symlink, and Nuxt is
# built here too.

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

# Full workspace install now: this image serves the Nuxt frontend too, so
# apps/web and its postinstall (nuxt prepare) are required. apps/api's own
# postinstall runs `prisma generate` — schema.prisma is already present
# because we copied the repo first.
RUN pnpm install --frozen-lockfile

# NITRO_PRESET=node makes Nuxt emit an entry that EXPORTS a (req, res)
# handler instead of starting its own HTTP server, so Express can mount it
# as middleware. Set here rather than in nuxt.config.ts so local `nuxt dev`
# and `nuxt build` keep their normal standalone behaviour.
RUN NITRO_PRESET=node pnpm --filter foundit-web build

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

# Nitro's output is self-contained (it bundles its own server dependencies),
# so no extra install is needed for the frontend.
COPY --from=builder /app/apps/web/.output apps/web/.output

WORKDIR /app/apps/api

# Documentation only — Render injects its own PORT, which env.ts coerces.
EXPOSE 3001

# Migrations run on every container start (idempotent: migrate deploy only
# applies pending ones). cwd is /app/apps/api, so env.ts's lookup of
# ../../.env finds nothing and dotenv no-ops — env vars come from Render.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]