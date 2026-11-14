# FoundIt Fullstack — Project Instructions

Checked against the repository on 2026-11-14 (#241). Where this file and the
code disagree, the code is right and this file needs a fix.

There is deliberately no "current state" section. The one this file used to
have described July until November. Status lives on the board — see
"Where the work is tracked" at the end.

## Project Overview

FoundIt is a full-stack web application that helps users discover where to
watch movies and series across streaming services. Primary audience: EU
residents who subscribe to streaming services in one country and travel or live
in another.

It is an examensarbete. Delivery is 18 December 2026.

## Languages

- Code, comments, commit messages, issues and pull requests: **English**.
- `DEVLOG.md`: **Swedish**.
- The app itself: English, Spanish and Swedish. Every user-facing string goes
  in all three locale files; `apps/web/tests/i18n-parity.test.ts` fails the
  build if their keys differ.

Commits follow Conventional Commits with a scope — `fix(api): …`,
`feat(web): …`, `docs(devlog): …`, `build: …`. Branches are named after the
issue (`370-urgent-upgrade-…`) or by kind (`docs/devlog-2026-10-27`,
`fix/privacy-location-granularity`). Changes reach `main` through pull
requests.

## Naming Convention

Use **"series"**, not "tv", everywhere in our own code: types, functions,
files, routes, `mediaType` values (`"movie" | "series"`). Decided 2026-07-15.

TMDB's own API keeps its native naming (`/tv/:id`, `TmdbSeries` wraps a TMDB
"tv" object, `status: "Returning Series"`). Only our layer on top of it says
"series".

One leftover: `GenresResponse` in `packages/types/src/catalog.ts` is
`{ movie, tv }`. It is ours, it says `tv`, and `useGenres` reads `data.tv`.

## Tech Stack

| Layer        | Technology                                                 |
| ------------ | ---------------------------------------------------------- |
| Frontend     | Nuxt 4, Vue 3, Tailwind CSS 3                              |
| Backend      | Node.js 26.12.1, Express 5                                 |
| Database     | PostgreSQL (18 locally and in CI, Neon in production)      |
| ORM          | Prisma 7 with the `pg` driver adapter                      |
| Auth         | Better Auth 1.6 (email/password + Google OAuth)            |
| Monorepo     | pnpm 11 workspaces                                         |
| Shared types | `packages/types` (`@foundit/types`), raw TypeScript source |
| State        | Pinia, TanStack Query (vue-query)                          |
| Validation   | Zod 4                                                      |
| i18n         | `@nuxtjs/i18n` — en (default), es, sv                      |
| Tests        | Vitest; Supertest in the API, `@nuxt/test-utils` in web    |
| CI/CD        | GitHub Actions                                             |
| Deploy       | Render (one Docker web service) + Neon (database)          |

Node is pinned in three places that must move together: `.nvmrc`, the
`Dockerfile` base image, and `engines` in the root `package.json`.

**TypeScript: the manifests and the install disagree.** `apps/api` and
`packages/types` declare `^7.0.2`. `pnpm-workspace.yaml` has
`overrides: typescript: ^6.0.3`, and that is what is installed (6.0.3). Read
"TypeScript / tsconfig Notes" below with that in mind. Tracked in #387.

## Deployment

One Render web service serves both apps from one origin. In production
`apps/api/src/app.ts` mounts Nuxt's build output: static files from
`apps/web/.output/public`, then Nitro's request handler (`NITRO_PRESET=node`,
set in the `Dockerfile`) for everything that is not an API route. One origin is
what keeps Better Auth's session cookie first-party.

- Free plan, Frankfurt, one instance. It sleeps when idle; the first request
  after a sleep pays for the start. The database is Neon and autosuspends too.
- `GET /health` is Render's health check and touches nothing else on purpose —
  querying the database there would keep Neon awake. `GET /health/ready` does
  query it and is for manual use.
- Render's auto-deploy is off. Production is deployed by the `deploy` job in
  `.github/workflows/ci.yml`, which calls a deploy hook after the checks pass
  and after a manual approval on the `production` environment. Pushes that
  only touch `*.md` do not trigger the workflow.
- The container runs `prisma migrate deploy` on every start, then
  `node dist/server.js`.
- Render sits behind Cloudflare. `app.set("trust proxy", 3)` was measured
  (#148) and must be re-measured if the hosting changes.
- No scheduler and no outbound SMTP on this plan. Nothing in the app sends
  email (#290) or runs in the background.

In development the two apps run separately: Nuxt on :3000, the API on :3001.

## Repository Structure

```
foundit-fullstack/
├── apps/
│   ├── api/                  ← Express backend (foundit-api, port 3001)
│   │   ├── prisma/           ← schema.prisma, migrations/, seed.ts
│   │   ├── prisma.config.ts  ← datasource URL for the Prisma CLI
│   │   ├── src/
│   │   │   ├── app.ts        ← builds the Express app; no listen()
│   │   │   ├── server.ts     ← process entrypoint: DB check, listen, shutdown
│   │   │   ├── config/       ← env.ts (Zod-validated), constants.ts
│   │   │   ├── routes/       ← {catalog,library,profile}/ — paths and auth only
│   │   │   ├── controllers/  ← {catalog,library,profile}/ — parse, call, respond
│   │   │   ├── services/     ← {catalog,library,profile}/ — logic that does I/O
│   │   │   ├── helpers/      ← tmdbMedia.ts — shared TMDB normalisation
│   │   │   ├── lib/          ← auth.ts, prisma.ts, tmdb.ts, cache.ts
│   │   │   ├── middleware/   ← errorHandler.ts, rateLimit.ts
│   │   │   └── types/        ← tmdb.types.ts, express.d.ts
│   │   └── tests/            ← integration suites, fixtures/, helpers/
│   └── web/                  ← Nuxt 4 frontend (foundit-web, port 3000)
│       ├── app/              ← see "Frontend" below
│       ├── i18n/locales/     ← en.json, es.json, sv.json
│       ├── public/
│       └── tests/
├── packages/types/           ← @foundit/types
├── docs/                     ← data-model.dbml/.png, test-round-2026-08/
├── .github/workflows/ci.yml
├── Dockerfile                ← builds both apps into one image
├── docker-compose.yml        ← local Postgres only
├── DEVLOG.md                 ← development log, in Swedish
└── .env.example              ← copy to .env; apps/api reads the root .env
```

## Backend

### Layers

A request passes through three files, and each has one job:

- **`routes/`** — the path, the HTTP verb, and whether `requireAuth` runs.
- **`controllers/`** — the HTTP adapter. Parses `req.query` / `req.body` /
  `req.params` with a Zod schema, calls one service function, sends
  `{ success: true, data }`. No business logic.
- **`services/`** — everything else. Never imports Express types.

Three domains, the same in all three folders: **`catalog`** (TMDB-backed, mostly
public), **`profile`** (the user's countries, services, settings) and
**`library`** (watchlist, history, ratings).

Imports use the `@/` alias for `apps/api/src`.

### Routes

Everything versioned lives under `/api/v1`. `/health` and `/health/ready` are
unversioned.

| Path                                                         | Auth     | Notes                                     |
| ------------------------------------------------------------ | -------- | ----------------------------------------- |
| `/auth/*`                                                    | —        | Better Auth's own handler                 |
| `GET /movies/:id`, `/series/:id`                             | optional | Adds `user` and `subscribed` if signed in |
| `GET /movies/:id/recommendations` (+ series)                 | no       | Page 2 onwards; page 1 is in the detail   |
| `GET /series/:id/season/:n`                                  | no       | Not called by the frontend yet (#389)     |
| `GET /people/:id`                                            | no       |                                           |
| `GET /search`                                                | no       | `q` ≥ 3 characters                        |
| `GET /discover/movies`, `/discover/series`                   | yes      | Every filter reads the user (#210)        |
| `GET /genres`, `/countries`, `/providers`, `/certifications` | no       | Cached in memory                          |
| `GET/PUT/DELETE /profile`                                    | yes      | DELETE removes the account                |
| `/profile/countries`, `/profile/services`                    | yes      | GET, POST, DELETE                         |
| `GET /profile/media-state`                                   | yes      | Watchlist and watched state as ids only   |
| `/watchlist`, `/history`, `/ratings`                         | yes      | `GET /ratings` has no page that uses it   |

Better Auth's handler is mounted **before** `express.json()` because it needs
the raw body.

### Conventions that are easy to get wrong

- **Responses.** Success is `{ success: true, data }`. Errors are
  `{ success: false, error: { message, code, statusCode, details? } }` and are
  formatted in exactly one place, `middleware/errorHandler.ts`. Throw
  `new AppError(message, status)` from a service; throw nothing custom for
  validation — a `ZodError` becomes a 400 with field details by itself.
  Express 5 forwards rejected promises, so handlers are plain `async`
  functions with no wrapper.
- **`lang`.** Every endpoint takes our `SupportedLocale` (`en`/`es`/`sv`), not
  a TMDB language code, and maps it with `LOCALE_TO_TMDB_LANG`. An unknown
  value falls back to `en` rather than failing.
- **TMDB calls go through `lib/tmdb.ts`.** `fetchTmdb` is the raw call
  (404 → 404, anything else → 502, network or timeout → 503).
  `fetchTmdbWithFallback` adds the English fallback for an empty `overview` or
  `biography` and is for **detail** endpoints only. Lists — watchlist, history,
  discover, search — use plain `fetchTmdb` with a `language` parameter, on
  purpose: none of them renders an overview and the fallback costs a second
  call per item (#189).
- **Every paginated `orderBy` ends in a unique column.** `year`, `createdAt`
  and `_max(createdAt)` are not unique, and Postgres promises no order between
  tied rows, so `LIMIT`/`OFFSET` over them can show an item twice or never.
  `services/library/watchlist.ts` and `history.ts` both carry the rule.
- **Batch the database, not the row.** A list page costs a fixed number of
  queries whatever its length; per-row lookups were the pool amplifier behind
  #238. The TMDB enrichment is the part that is still one call per item.
- **`WatchedItem.seasonNumber` is `NULL` for a movie**, and Postgres treats
  every `NULL` in a unique constraint as distinct. So a movie cannot be
  upserted on the compound key — it is `findFirst`, then create or update — and
  the constraint does not prevent a duplicate (#384).
- **Season 0 is TMDB's specials.** `airedSeasons()` in `helpers/tmdbMedia.ts`
  skips it and counts only seasons whose air date has passed. Use it, not
  `number_of_seasons`, for anything about what a viewer could have watched
  (#300).
- **Rate limiting lives in `middleware/rateLimit.ts` and only there.** Better
  Auth's own limiter is disabled on purpose (#153). `apiLimiter` covers
  `/api/v1`; `authLimiter` covers the credential endpoints.
- **`lib/cache.ts` is a plain in-memory `Map`.** No eviction, no size limit,
  gone on restart. Fine for a handful of catalogue lists; not a place for
  per-title payloads (#377).
- **The Content Security Policy is in `app.ts`** and covers the frontend too.
  A new third-party host — script, image, frame or `fetch` — needs a directive
  there, or it fails in production only.
- **Content safety.** Discover and search send `include_adult: false` and
  filter on TMDB's `adult` flag; Discover also excludes two keywords. See the
  comment on `EXCLUDED_KEYWORDS` in `services/catalog/discover.ts` before
  touching it.

### Authentication

Better Auth, configured in `lib/auth.ts`, with `basePath: "/api/v1/auth"` — it
must match where `app.ts` mounts the handler and the `basePath` in
`apps/web/app/composables/auth/useAuthClient.ts`.

- `requireAuth` rejects with 401 and sets `req.session`. `getUserId(req)` reads
  the id. `extractSession(req)` is for endpoints where a session is optional.
- Sessions last 7 days and are cached in the cookie for 5 minutes, so a
  revoked or deleted session keeps working for up to that long.
- Email addresses are not verified (#291), so every password account has
  `emailVerified: false`.
- **Account linking.** `trustedProviders: ["google"]` is set, but Better Auth
  1.6.23 also requires the _local_ address to be verified before it links
  (`requireLocalEmailVerified`, default `true`). So a Google sign-in whose
  address matches a password account is refused with `account_not_linked`,
  and the app shows no message for it (#292). Do not set that option to
  `false`.

## Frontend

### Layout of `apps/web/app`

```
app/
├── app.vue           ← NuxtLayout + NuxtPage, plus the two global singletons:
│                       MediaDetailsModal and ToastContainer
├── assets/css/main.css  ← colour tokens as CSS variables; the focus ring
├── layouts/          ← default.vue, auth.vue
├── middleware/       ← authenticated.ts (named, not global)
├── pages/            ← index, watchlist, history, profile, login, register,
│                       about, privacy, terms
├── plugins/          ← auth.ts, vue-query.ts, umami.ts, zod-jitless.client.ts
├── stores/           ← auth, profile, discover, search, mediaModal, toast
├── composables/      ← api/ auth/ discover/ history/ library/ media/ profile/
│                       search/ ui/ watchlist/  (auto-imported, all depths)
├── components/       ← auth/ discover/ home/ layout/ legal/ media/
│                       media-detail/ profile/ search/ ui/ user/
└── utils/            ← tmdbImage.ts, authUser.ts
```

Components are registered without a path prefix: `components/media/MediaCard.vue`
is `<MediaCard>`. Composables under any depth of `composables/` are
auto-imported.

### How the pages fit together

- **`/` is three screens in one page.** Signed out and idle: the landing.
  Signed in and idle: Discover. With `?q=`: search results. There is no
  `/search` or `/discover` route.
- **A title has no URL.** Movies, series and people open in
  `MediaDetailsModal`, driven by the `mediaModal` store, which keeps a history
  stack for "back". Routes for titles are #219.
- **`/watchlist`, `/history` and `/profile`** use the `authenticated`
  middleware.
- **`/terms` is a placeholder**; `/privacy` is real and has to stay accurate
  when what the app collects changes.

### Conventions that are easy to get wrong

- **Every API call goes through `useApi().apiFetch`.** It picks the base URL
  (loopback during SSR, the public origin in the browser), forwards the
  session cookie during SSR, adds `lang` to every request, and on a 401 clears
  the local session and sends the user to login. The exceptions are
  deliberate: `plugins/auth.ts` and `useAuth().signOut` call `$fetch` directly,
  because a 401 there is not an error, and the login and register pages use the
  Better Auth client from `useAuthClient()`.
- **`lang` is the app locale (`en`/`es`/`sv`)**, not `useLocale().tmdbLanguage`.
  The API's schemas expect the former.
- **Links go through `localePath()`.** The i18n strategy is
  `prefix_except_default`, so a bare `"/profile"` points at the English route
  and switches the whole interface (#169).
- **The active locale is part of every TanStack query key** that returns
  localised content (#218): `["watchlist", locale, params]`,
  `["genres", locale]`. A key without it serves the previous language from
  cache.
- **Server-rendered data: prefetch on the server, read with the same options
  on the client** (#192). Each query has an options factory —
  `watchlistQueryOptions`, `profileQueryOptions`, … — used by
  `queryClient.prefetchQuery` in the page's `if (import.meta.server)` block and
  by the composable. `plugins/vue-query.ts` dehydrates on `app:rendered` and
  hydrates on the client. Server-side queries do not retry.
- **Lists are infinite queries, one page at a time** (#234).
  `prefetchInfiniteQuery` fetches the first page during SSR. Filter and sort
  live in the URL through `composables/library/useListParams.ts`, which checks
  them against a whitelist so a stale link falls back to the default.
- **Two data-fetching styles coexist.** TanStack Query for profile, media
  state, watchlist, history, genres, countries and providers; `useAsyncData`
  for the three detail views and certifications; Pinia stores with hand-written
  fetching for Discover and search. Match what the neighbouring code does
  rather than introducing a fourth.
- **`useMediaState()` is the source of truth for "is this on my watchlist / have
  I watched it"** on every card and in the modal (#231). Mutations update its
  cache optimistically and roll back on error.
- **The profile store is a projection of the session.** `authStore.clearUser()`
  resets it; whoever ends a session does not have to remember to.
- **Colours come from the tokens** in `main.css` through Tailwind's theme
  (`bg-page`, `text-primary`, `text-brand`, …). There is one theme, dark.
- **Images go through `utils/tmdbImage.ts`.** TMDB serves a fixed list of
  widths and 404s on anything else.
- **Toasts** are `useToast()` — and like every composable that touches the Nuxt
  instance, it has to be called in the setup body. That rule is the next
  section.

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

Source of truth: `apps/api/prisma/schema.prisma`. `docs/data-model.dbml` is the
drawing.

- **User** — Better Auth's, plus `ageRatingCountry` (nullable).
- **Session, Account, Verification** — Better Auth's. `Account` stores the
  provider's tokens (#378).
- **StreamingService** — `(countryCode, providerId)` UNIQUE. A local copy of
  TMDB's provider catalogue per country, written by `getProviders` whenever its
  cache is cold (#377). `POST /profile/services` validates against it, so a
  country's providers must have been fetched once before a service can be added.
- **UserCountry** — `(userId, countryCode)` UNIQUE.
- **UserStreamingService** — `(userId, providerId, countryCode)` UNIQUE.
  Removing a country removes its services in the same transaction.
- **WatchlistItem** — `(userId, tmdbId, mediaType)` UNIQUE. Carries `year`,
  cached at add time so the list can be ordered by it. It had a `title` column
  until #234 dropped it.
- **WatchedItem** — `(userId, tmdbId, mediaType, seasonNumber)` UNIQUE. One row
  per movie (`seasonNumber` NULL) or per season. Re-watching bumps `createdAt`.
- **UserRating** — `(userId, tmdbId, mediaType)` UNIQUE, 1–10, `updatedAt`
  tracked.

A title can be on the watchlist and in the history at once; the two are not
exclusive, and the UI shows both.

`mediaType` is a plain `String` column, `"movie"` or `"series"`. All ids are
UUIDs. Every relation to `User` cascades on delete: deleting the user row is
the whole of account deletion (hard delete, no soft delete).

## Key Architecture Decisions

1. **API-first.** All TMDB calls go through the Express backend; the frontend
   never calls TMDB. A future mobile app would use the same API.
2. **TMDB v3 for content, our own database for everything about the user.**
3. **Highlights are computed in the backend.** It cross-references TMDB's
   providers with the user's subscriptions and marks matches `subscribed: true`.
   The rule is that rent and buy never count as "subscribed". Today only the
   detail view enforces it: `buildProviders` and the two `collectSubscribed*`
   helpers include rent and buy, so the watchlist highlight and the new-season
   flag count them too (recorded on #304).
4. **Watch history is per season.** One `WatchedItem` row per season, one table
   for movies and series.
5. **TMDB's rating and the user's rating are never combined.**
6. **Nothing runs in the background.** New-season detection happens when the
   series detail or the watchlist is fetched, and requires the user to have
   watched at least one season already.
7. **Multi-language.** The backend takes `lang` and passes TMDB the mapped
   code. Detail endpoints add the English fallback for empty text; lists do
   not. See "Conventions" under Backend.
8. **Hard delete and cascade.** No soft delete anywhere.
9. **No API key on public endpoints.** `/movies/:id` and the like must work
   without a session, and a key shipped to a browser is not a secret.
   Protection is rate limiting plus session cookies on user data. Since #26
   the frontend is served from the API's own origin and its server-side
   rendering calls the API over loopback, which is the closest this
   architecture gets to a backend-for-frontend.
10. **Discover's pool is a function of the filters, not of the page** (#239).
    Each request rebuilds the same pool and slices it, which is what makes
    paging a partition. Read the header comment of
    `services/catalog/discover.ts` before changing how it fetches.

## Environment Variables

- Root `.env` (read by `apps/api`, and by the Prisma CLI through
  `prisma.config.ts`): `DATABASE_URL`, `PORT`, `NODE_ENV`, `FRONTEND_URL`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, and for local HTTPS only `USE_HTTPS`,
  `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`. All validated by Zod in `config/env.ts`
  at startup.
- `apps/web/.env`: `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_APP_NAME`,
  `NUXT_PUBLIC_UMAMI_SCRIPT_URL`, `NUXT_PUBLIC_UMAMI_WEBSITE_ID`,
  `NUXT_PUBLIC_FEEDBACK_FORM_URL`. All public by construction.
- `apps/api/.env.test`: copied from `.env.test.example`; loaded by the tests
  with `override: true`, so it wins over anything in the shell.
- `TMDB_API_KEY` holds the **API Read Access Token** — the long JWT sent as
  `Authorization: Bearer` — not the v3 "API Key". The name is misleading; the
  value is the token.
- In production the database URL must carry `sslmode=verify-full` (#277).
- `USE_HTTPS` is parsed with `z.coerce.boolean()`, which reads the string
  `"false"` as true (#385). It only stays off because the two paths are empty.

## TypeScript / tsconfig Notes

- `verbatimModuleSyntax: true` (`tsconfig.base.json`): an import that is only
  used as a type must be `import type`.
- `apps/api/tsconfig.json` has no `baseUrl`, `rootDir` or `outDir`. Imports
  resolve through `paths: { "@/*": ["./src/*"] }`; the build is esbuild
  (`apps/api/esbuild.config.mjs`), not `tsc`, and `tsc` only typechecks.
- `@foundit/types` exports raw `./src/index.ts`, not a built `dist`. esbuild
  bundles it into the API; Nuxt compiles it itself. That is why `apps/api`
  cannot have a `rootDir`.
- `apps/web/tsconfig.json` only references the files Nuxt generates under
  `.nuxt/`. Shared options are merged in through `typescript.tsConfig` in
  `nuxt.config.ts`; editing the generated files does not survive
  `nuxt prepare`.
- The July notes about a TypeScript 7 migration described the manifests. The
  installed compiler is 6.0.3 — see the Tech Stack section.

## Prisma 7 Specifics

- `apps/api/prisma.config.ts` supplies the datasource URL to the CLI;
  `schema.prisma` has `datasource db { provider = "postgresql" }` with no `url`.
- Import with `import { PrismaClient } from "@prisma/client"`. The client uses
  the `PrismaPg` adapter over a `pg` `Pool` (`lib/prisma.ts`), so TLS is decided
  by the connection string and by nothing else.
- `$connect()` does not reach the network with a driver adapter. To check the
  database is there, run a query — `server.ts` does (#166).
- `upsert` cannot be used on a compound unique key with a nullable column; use
  `findFirst` and then `create` or `update`.
- **The schema, the generated client and the database are three things, and
  `tsc` reads one of them.** A clean install can wipe the generated client —
  `postinstall` regenerates it, and `pnpm --filter foundit-api db:generate`
  does it by hand. `prisma migrate dev` can also leave the client stale: the
  migration applies, the tests fail on a column that no longer exists, and the
  typecheck passes because the column was optional. Regenerate after any
  migration.

## TMDB Notes

- Bearer token, v3 endpoints. TMDB's own names are unaffected by our
  tv → series rename: `/search/multi`, `/discover/movie`, `/discover/tv`,
  `/movie/:id`, `/tv/:id`, `/person/:id`.
- Detail calls use `append_to_response` to fetch credits, videos,
  recommendations, providers and certifications in one request.
- Shared normalisation — trailer, cast, crew, providers, recommendations, age
  ratings, aired seasons — lives in `helpers/tmdbMedia.ts`. Extend it rather
  than duplicating.
- TMDB's provider data comes from JustWatch and must be attributed; the
  attribution is in `ProvidersSection.vue` and on `/about`.

## Testing

- `pnpm test` runs both suites. The API's needs Postgres running
  (`pnpm db:up`) and `apps/api/.env.test` in place; it migrates the
  `foundit_test` database first.
- **API** (`apps/api/tests`): integration tests with Supertest against the real
  app (`import { app } from "@/app"`) and a real database. TMDB is never
  called — suites `vi.mock("@/lib/tmdb")` and feed it from `fixtures/tmdb.ts`.
  `helpers/auth.ts` creates a signed-in user and returns its cookie;
  `helpers/db.ts` empties the tables. Files run one at a time
  (`fileParallelism: false`) because they share the database. The rate
  limiters are no-ops under `NODE_ENV=test`.
- **Web** (`apps/web/tests`): `@nuxt/test-utils` with the `nuxt` environment
  and `mountSuspended`. Few suites exist; the open ones are under #11.
- Not covered at all: the catalogue endpoints and `lib/tmdb.ts` (#399).

## Development Commands

```bash
pnpm install                           # also runs prisma generate and nuxt prepare
pnpm db:up                             # start local Postgres (docker compose)
pnpm db:down                           # stop it
pnpm db:reset                          # drop the volume and start clean
pnpm dev                               # both apps
pnpm --filter foundit-api dev          # API only (port 3001)
pnpm --filter foundit-web dev          # web only (port 3000)

pnpm --filter foundit-api db:migrate   # prisma migrate dev
pnpm --filter foundit-api db:generate  # regenerate the Prisma client
pnpm --filter foundit-api db:seed      # two test users with sample data
pnpm --filter foundit-api db:studio    # Prisma Studio

pnpm typecheck                         # every workspace package
pnpm lint                              # eslint
pnpm format:check                      # prettier; `pnpm format` to fix
pnpm test                              # both suites
```

`typecheck`, `lint`, `format:check` and `test` are what CI runs, in that order.
Run them before opening a pull request. CI does not build either app (#387),
so a change that typechecks but breaks `nuxt build` or the `Dockerfile` is only
found on deploy — build locally when touching either.

The seed creates accounts with published passwords. It is for a local
database only.

## Measuring without instrumentation

`__NUXT_DATA__` in a server-rendered page carries `dataUpdatedAt` for each
dehydrated query and one `dehydratedAt` for the render, so an authenticated
page decomposes its own cost with no logging and no deploy. It is how #234 and
#254 were measured. One trap: TanStack only dehydrates queries in `success`, so
a failed prefetch leaves no trace at all. A payload with one query where two
were expected means one of them failed.

The server itself logs nothing about requests (#275).

## Where the work is tracked

- **Board:** https://github.com/users/JoseRaul-TR/projects/4 — fields
  `Status`, `Priority` (Critical/High/Medium/Low) and `Size` (XS–XL).
- **Milestones:** `Delivery` (18 December 2026) for what the examensarbete
  needs; `After delivery` for everything else. Issues labelled `Exploration`
  carry no milestone, priority or size by definition.
- **From a terminal:**

  ```bash
  gh issue list --milestone "Delivery"
  gh issue list --label Security
  gh issue view <number>
  ```

Issue numbers in this file and in code comments are GitHub issue numbers and
can be read with `gh issue view`. Many decisions are explained in the issue
that made them and in the comment beside the code, not here.
