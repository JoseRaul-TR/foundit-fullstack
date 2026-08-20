# FoundIt Fullstack — Project Instructions

> **Stale as of 2026-08-20.** Most of this file was written in July, when
> `apps/web` did not exist. Known wrong: the deploy platform, the repository
> structure, the data model, and everything under "Current State", "Weekly
> Plan" and "Backlog". #241 tracks the rewrite.
>
> Trustworthy as written: "Composables and the Nuxt instance", the
> TypeScript 7 and Prisma 7 notes, and the TMDB key notes.

## Project Overview

FoundIt is a full-stack web application that helps users discover where to watch movies and TV series across streaming services worldwide. Primary target: EU residents who subscribe to streaming services from one country and travel or live in another (EU portability rules).

## Naming Convention

Use **"series"**, not "tv", everywhere in our own code: types, functions, files, routes, `mediaType` values ("movie" | "series"). Decided 2026-07-15 for consistency across the codebase.

Exception: TMDB's own API is external and keeps its native naming (`/tv/:id`, `TmdbTVShow`, `status: "Returning Series"`, etc.) — only OUR layer on top of it (services, routes, response shapes, DB values) says "series".

**Known follow-up, not yet done:** `packages/types/src/media.ts`'s `MediaType` still says `"movie" | "tv"`. Needs updating to `"movie" | "series"`, and `WatchlistItem`/`WatchedItem`/`UserRating` in `user.ts` reuse that type. Also check any seeded DB rows created with `mediaType: "tv"` before the rename — they won't match `"series"` queries anymore; safest fix at this stage is `pnpm db:reset` + reseed rather than a data migration.

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Frontend     | Nuxt 4, Vue 3, TypeScript, Tailwind CSS     |
| Backend      | Node.js, Express 5, TypeScript 7.0.2        |
| Database     | PostgreSQL 16, Prisma 7                     |
| Auth         | Better Auth (email/password + Google OAuth) |
| Monorepo     | pnpm workspaces                             |
| Shared types | packages/types (@foundit/types)             |
| State        | Pinia, TanStack Query                       |
| Validation   | Zod 4 (zod/mini for frontend)               |
| i18n         | @nuxtjs/i18n (en active, es/sv ready)       |
| CI/CD        | GitHub Actions                              |
| Deploy       | Vercel (frontend) + Railway (backend + DB)  |

## Repository Structure

```
foundit-fullstack/
├── apps/
│   ├── web/          ← Nuxt 4 frontend (port 3000)
│   └── api/          ← Express backend (port 3001)
│       └── src/
│           ├── config/     ← Zod-validated env
│           ├── helpers/    ← pure normalization functions, no I/O
│           │                 (e.g. tmdbMedia.helpers.ts — shared by
│           │                 movies.ts and series.ts; not "services"
│           │                 because it has no side effects)
│           ├── lib/        ← infra clients (prisma, tmdb, auth)
│           ├── middleware/ ← errorHandler, rateLimit
│           ├── routes/     ← Express routers per resource
│           ├── services/   ← business logic that does I/O (TMDB + DB)
│           └── types/      ← TMDB response interfaces, express.d.ts
├── packages/
│   └── types/        ← Shared TypeScript types (@foundit/types)
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .env              ← root env (api only — never expose to client)
```

## Key Architecture Decisions

1. **API-first**: All TMDB calls go through Express backend — frontend never calls TMDB directly. Future React Native app will use the same API.
2. **TMDB API v3 only**: User data (watchlist, history, ratings) stored in own PostgreSQL DB.
3. **Highlights logic in backend**: Backend cross-references TMDB providers with user subscriptions and returns `subscribed: true` on matching providers.
4. **Watch history at season level**: One WatchedItem row per season watched. Single table for movies and series (mediaType + seasonNumber nullable).
5. **Separate TMDB and personal ratings**: Never combined. TMDB rating always visible; personal rating shown only when authenticated user has rated.
6. **New season detection on-demand**: Checked when the series detail endpoint or watchlist is fetched. No background jobs in MVP. Requires the user to have watched at least one season already — the literal ticket wording (compare against "max watched season", defaulting to 0 for a show never touched) would flag every returning show for every user, which doesn't make product sense.
7. **Multi-language**: Backend receives `lang` param, passes to TMDB with en-US fallback via `fetchTmdbWithFallback` (lib/tmdb.ts). Merges: keeps the translated title/name if present, only backfills empty `overview`/`biography` from en-US. `SupportedLocale` + `LOCALE_TO_TMDB_LANG` in `@foundit/types` (packages/types/src/i18n.ts).
8. **Hard delete + CASCADE**: GDPR compliant — no soft delete. All user data deleted on cascade when User is deleted.
9. **No API-key gate on public endpoints**: Discussed 2026-07-15. Endpoints like `/api/movies/:id` and `/api/series/:id` must work unauthenticated by design, so there's no secret a public web/mobile client can hold that a copied request from devtools/a decompiled app wouldn't also have — an embedded API key would be cosmetic, not real security. Current protection is CORS (blocks other websites' browser JS, not curl/servers) + rate limiting (`globalLimiter`, `tmdbLimiter`) + Better Auth session cookies on user-data routes (real security, since a session is a genuine per-login secret). A BFF pattern (Nuxt SSR calling `foundit-api` server-to-server with a real shared secret for public pages) is the actual way to hide the API, but it depends on `apps/web` existing — deferred until Vecka 6.

## Composables and the Nuxt instance (#211)

A Nuxt composable — anything that reads the Nuxt instance: `useRequestHeaders`,
`navigateTo`, `useI18n`, `useToast`, `useApi` — must be called from a setup
body or from another composable's body. Not from an event handler, a watcher,
a catch block or a TanStack Query callback.

**These fail silently.** The two cases that cost real time:

- `useApi`'s 401 handler called `navigateTo` from inside a vue-query
  `mutationFn`. The navigation resolved and did not navigate (#174). Three
  wrong hypotheses to find it, because nothing warned.
- `ServiceSelector.vue`'s catch block called
  `useToast().error(useI18n().t("errors.generic"))`. The toast for a failed
  toggle was very likely never shown (#135).

**The worked example.** `useRequestHeaders` reads the incoming SSR request, so
calling it late does not throw — it returns nothing useful and the request goes
out anonymous, indistinguishable from a logged-out user. `useApi` captures it
in the composable body and closes over it:

    const forwardedCookie = import.meta.server
      ? useRequestHeaders(["cookie"]).cookie
      : undefined;

    async function apiFetch<T>(path, options = {}) {
      const headers = new Headers(options.headers);
      if (forwardedCookie) headers.set("cookie", forwardedCookie);
      // …
    }

The rule is: call it in the body, close over the result.

**Two things that look like violations and are not.**

Pinia stores. `useProfileStore()` inside `auth.ts`'s `clearUser()` action needs
Pinia's instance, not Nuxt's, and that is available wherever the action runs.

Composables after a top-level `await` in a page's `<script setup>`. Nuxt
restores the async context, so `useProfileQuery()` after `await prefetchQuery`
in `index.vue` works. It works by a guarantee rather than by construction —
prefer reading what you need before the await (as `watchlist.vue` does with
`useLocale()`), so nobody has to know about the guarantee to move the code
safely.

**When adding a page with a top-level `await`:** read every composable you need
above it. That is what `watchlist.vue`, `history.vue` and `index.vue` do with
`useLocale()` and `useApi()`.

## Data Model

- **User** (Better Auth managed)
- **Session, Account, Verification** (Better Auth managed)
- **UserCountry**: (userId, countryCode) UNIQUE
- **UserStreamingService**: (userId, providerId, countryCode) UNIQUE — no StreamingService table, provider metadata from TMDB API
- **WatchlistItem**: (userId, tmdbId, mediaType) UNIQUE — mutually exclusive with WatchedItem
- **WatchedItem**: (userId, tmdbId, mediaType, seasonNumber) UNIQUE
- **UserRating**: (userId, tmdbId, mediaType) UNIQUE — upsert on update, updatedAt tracked
- `mediaType` is a plain `String` column (no DB enum): `"movie"` | `"series"` (see Naming Convention above — was `"tv"` before 2026-07-15).
- All IDs: UUID. All tables: createdAt. Cascade delete on all User relations.

## Environment Variables

- Root `.env`: DATABASE_URL, PORT, NODE_ENV, FRONTEND_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, TMDB_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- `apps/web/.env`: NUXT_PUBLIC_API_BASE, NUXT_PUBLIC_APP_NAME
- `prisma.config.ts` loads root `.env` via dotenv for Prisma CLI commands
- `TMDB_API_KEY` holds the **API Read Access Token** (the long v4-style JWT, used as `Authorization: Bearer`), not the v3 "API Key" (that one's a `?api_key=` query param and would 401 if used here). Env var name is a bit misleading but the value is the read access token.

## TypeScript / tsconfig Notes (2026-07-15)

- Upgraded 6.0.3 → **7.0.2** (6.0.3 was already the latest 6.x release; no smaller bump existed).
- TS7 removed `baseUrl` entirely. `apps/api/tsconfig.json` replaces it with the officially suggested equivalent:
  ```json
  "paths": { "*": ["./*"] }
  ```
  This keeps every existing bare `"src/lib/..."`-style import resolving exactly as before — nothing needed to change at the call sites.
- `verbatimModuleSyntax: true` enabled (tsconfig.base.json) — any import that's 100% type-only must use `import type`. Caught 4 violations on rollout: `index.ts`, `middleware/errorHandler.ts`, `middleware/rateLimit.ts`, `services/movies.ts`.
- Removed `rootDir`/`outDir` from `apps/api/tsconfig.json`. This wasn't just TS7 cleanup — it fixed a real `TS6059` error: `@foundit/types`'s `package.json` `exports` points at raw `./src/index.ts` (not a built `dist`), which violated apps/api's `rootDir` the moment any file imported it.
- `packages/types/tsconfig.json` dropped `ignoreDeprecations: "6.0"` (only existed to silence the now-moot baseUrl deprecation warning).
- Prisma gotcha discovered during this upgrade: a clean `pnpm install` can wipe the generated `.prisma/client` output, and `@prisma/client`'s un-generated stub (`default.js`) doesn't export `PrismaClient`/`Prisma` at all — looks like a real compile error but is fixed by `pnpm --filter foundit-api db:generate`. Consider adding `"postinstall": "prisma generate"` to `apps/api/package.json` to avoid hitting this again.

## Prisma 7 Specifics

- `prisma.config.ts` at `apps/api/prisma.config.ts` — manages datasource URL
- `schema.prisma` has `datasource db { provider = "postgresql" }` WITHOUT url field
- Import: `import { PrismaClient } from "@prisma/client"`
- Uses `PrismaPg` adapter from `@prisma/adapter-pg` with `pg` Pool
- `upsert` with nullable fields in compound unique index requires `findFirst` + `create` pattern
- After any clean install / dependency bump, run `pnpm --filter foundit-api db:generate` before typechecking — see TypeScript notes above.

## TMDB API Key Notes

- Use the "API Read Access Token" (Bearer token, v4-style), not the v3 "API Key"
- All endpoints use TMDB v3
- Key TMDB endpoints (their own naming, unaffected by our tv→series rename): /search/multi, /discover/movie, /discover/tv, /movie/:id, /tv/:id, /person/:id
- Our own exposed routes: `/api/movies/:id`, `/api/series/:id` (not `/api/tv/:id`)
- append_to_response pattern: `?append_to_response=credits,videos,recommendations,watch/providers`
- `lib/tmdb.ts` exports `fetchTmdb` (raw call, AppError on non-2xx/timeout) and `fetchTmdbWithFallback` (adds the en-US language fallback described in Architecture Decision #7)
- Shared normalization (trailer/cast/providers/recommendations extraction) lives in `helpers/tmdbMedia.helpers.ts`, reused by both `services/movies.ts` and `services/series.ts` — extend it rather than duplicating logic when adding search/discover/people.

## Current State (as of 2026-07-15)

### Completed tickets

- Monorepo, Docker, Tailwind, data model design, Express+Zod setup, Prisma schema+migrations, seed script
- Better Auth: email/password + Google OAuth (with account linking)
- Centralized error handler (`AppError`, `errorHandler`, `notFoundHandler`)
- Security middleware (helmet, CORS, rate limiting — `globalLimiter`, `authLimiter`, `tmdbLimiter`)
- **#34**: TMDB client with `fetchTmdbWithFallback` ✅
- **#38**: `GET /api/movies/:id` (providers, highlights, cast, trailer, recommendations) ✅
- **#39**: `GET /api/series/:id` (same as #38 + seasons list, per-season watched, new-season detection) ✅
- TypeScript 7.0.2 + `verbatimModuleSyntax` migration across apps/api and packages/types ✅

⚠️ **Ticket numbering note**: this file previously used an older numbering scheme (#9–#79) for the backlog below. The current live GitHub issues use a different scheme — confirmed numbers so far: Design/Figma wireframes are **#14–#20**, backend TMDB/user-data/tests endpoints are **#34–#55**. The Backlog section below has NOT been fully reconciled against the live GitHub Project — treat ticket numbers there as historical/approximate outside of the ranges just mentioned, and check the GitHub Project board (link below) for the authoritative current numbers before referencing a ticket number in a report or commit.

### In progress / next

- [ ] `GET /api/search` (#35) or `GET /api/discover/movies` / `GET /api/discover/tv` (#36/#37) — next in priority order
- [ ] Fix the `MediaType`/seed-data follow-up noted under Naming Convention above
- [ ] Figma wireframes (#14–#20) — deliberately deferred until the backend API is further along, to avoid designing against endpoints that might still change shape

### Upcoming

- Figma wireframes (#14–#20)
- Remaining backend TMDB/discover/people/genres/providers/countries endpoints (#35–#44)
- Backend user-data endpoints: profile, countries, services, watchlist, history, ratings (#45–#51)
- Backend tests: auth, watchlist, history, ratings (#52–#55)

## Development Commands

```bash
pnpm db:up                          # Start PostgreSQL
pnpm db:down                        # Stop PostgreSQL
pnpm db:reset                       # Reset database
pnpm --filter foundit-api dev       # Start API (port 3001)
pnpm --filter foundit-web dev       # Start web (port 3000)
pnpm --parallel -r dev              # Start both
pnpm --filter foundit-api db:migrate   # Run migrations
pnpm --filter foundit-api db:generate  # Regenerate Prisma client (run after any clean install)
pnpm --filter foundit-api db:seed      # Run seed
pnpm --filter foundit-api db:studio    # Open Prisma Studio
pnpm --filter foundit-api typecheck    # tsc --noEmit
pnpm -r typecheck                      # typecheck every workspace package
```

## Weekly Plan Summary

- **Vecka 3** (13–16 jul): TMDB client, movies/series detail endpoints, TypeScript 7 migration ← current
- **Vecka 4–5**: Remaining backend endpoints (search, discover, profile, watchlist, history, ratings) + tests
- **Vecka 6**: Frontend setup + public SSR pages (this is also when the BFF-pattern API-protection decision gets revisited)
- **Vecka 7**: Authenticated CSR pages
- **Vecka 8**: Responsive + accessibility + deploy
- **Vecka 9**: CI/CD + code quality
- **Vecka 10**: Documentation + LIA2 preparation

## Backlog

Managed in GitHub Project: https://github.com/JoseRaul-TR/foundit-fullstack/projects

Confirmed current numbering (from the live GitHub issues, 2026-07-15):

### DESIGN (Figma wireframes)

- #14 Search & discover views
- #15 Movie detail
- #16 TV/series detail
- #17 People page
- #18 Watchlist & history
- #19 User profile
- #20 Login & register

### BACKEND — TMDB

- #34 TMDB client with fetchTmdbWithFallback ✅
- #35 GET /api/search
- #36 GET /api/discover/movies
- #37 GET /api/discover/series
- #38 GET /api/movies/:id (with highlights) ✅
- #39 GET /api/series/:id (with highlights + new seasons) ✅
- #40 GET /api/series/:id/season/:n
- #41 GET /api/people/:id
- #42 GET /api/genres
- #43 GET /api/providers
- #44 GET /api/countries

### BACKEND — User data

- #45 GET/PUT /api/profile
- #46 GET/POST/DELETE /api/profile/countries
- #47 GET/POST/DELETE /api/profile/services
- #48 GET/POST/DELETE /api/watchlist
- #49 GET/POST /api/history (movies)
- #50 GET/POST/DELETE /api/history/seasons
- #51 GET/POST/PUT/DELETE /api/ratings

### BACKEND — Tests

- #52 Tests auth
- #53 Tests watchlist
- #54 Tests history
- #55 Tests ratings

### Everything else (INFRA, remaining BACKEND — Setup, FRONTEND, DOCS)

Not yet reconciled with the current GitHub issue numbers — see the GitHub Project board linked above for authoritative ticket numbers and status rather than trusting old numbers pasted into this file.
