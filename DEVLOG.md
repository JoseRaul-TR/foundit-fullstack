# DEVLOG — FoundIt Fullstack Web

Utvecklingsdagbok för FoundIt — en fullstack-webbapplikation för att
upptäcka var man kan se filmer och TV-serier på streamingtjänster globalt.

- **Repo:** [foundit-fullstack](https://github.com/JoseRaul-TR/foundit-fullstack)
- **Projektboard:** [FoundIt — Fullstack Development](https://github.com/users/JoseRaul-TR/projects/4)
- **Stack:** Nuxt 4 · Vue 3 · Express · PostgreSQL · Prisma · Better Auth
- **Deploy:** Vercel (frontend) · Railway (backend + DB)

---

## Vecka 1 (29 juni — 2 juli 2026)

### Måndag 29/6 — Projektdefinition, arkitektursbeslut och backlog-setup

#### Vad jag gjorde

Avslutade inlärningsfasen för Vue/Nuxt och påbörjade FoundIt-utvecklingen.
Dagen ägnades åt att definiera projektets scope, arkitektur och skapa
den fullständiga utvecklingsbackloggen.

**Scopedefinition:**

- FoundIt är en sökmotor för streaming-tillgänglighet — användare
  upptäcker var de kan se filmer, TV-serier och hitta information om
  personer (skådespelare, regissörer).
- Primär målgrupp: EU-medborgare som prenumererar på streamingtjänster
  från ett land och reser eller bor i ett annat (EU:s portabilitetsregler
  gäller).
- Sekundära användningsfall: hitta gratis streaming-alternativ,
  VPN-användare som vill se kataloger från andra länder, universell
  tracker för sedda titlar.

**MVP-funktioner definierade:**

- Global sökning: filmer, TV-serier, personer via TMDB /search/multi
- Discover: avancerade filter på genre, år, betyg, leverantör och region
- Filmdetalj: titel, beskrivning, trailer (YouTube-inbäddning), skådespelare,
  streaminglångivare per land, rekommendationer, TMDB-betyg,
  personligt betyg, watchlist/sedd-knappar
- TV-seriedetalj: samma som film plus säsongslista med märkning per säsong
  och badge för ny tillgänglig säsong
- Personsida: biografi, filmografi (skådespeleri + regi), fotogalleri
- Watchlist: lägg till/ta bort, filtrera per typ, sortera,
  leverantörshighlights, ny säsong-badge
- Tittarhistorik: filmer + TV-säsonger, personliga betyg
- Användarprofil: landskonfiguration, prenumererade streamingtjänster
  per land
- Autentisering: e-post/lösenord + Google OAuth (Better Auth)
- Flerspråkigt: i18n-redo från dag ett (endast `en` aktivt i MVP)
- Tema: ljust/mörkt/systemstandard

**Arkitektursbeslut:**

1. **Backend som enda datakälla (API-first)**
   Alla TMDB-anrop går via Express-backend — frontend anropar aldrig
   TMDB direkt. Motivering: en framtida React Native-app ska använda
   samma API utan duplicering.

2. **TMDB API v3 för allt innehåll**
   v4 kräver TMDB-användarkonton för watchlists. Vi använder vår egen
   PostgreSQL-databas för användardata istället, vilket ger full kontroll.

3. **Highlight-logik i backend**
   Backend korsar TMDB-leverantörer med användarens prenumererade
   tjänster i databasen och returnerar `subscribed: true` för matchande
   leverantörer. Frontend renderar bara — ingen affärslogik för
   highlights i klienten.

4. **Tittarhistorik på serie + säsongsnivå (ej episod)**
   En WatchedItem-rad per sedd säsong. Enklare datamodell, tillräcklig
   granularitet. Episodnivå skulle lägga till betydande komplexitet med
   minimalt mervärde för MVP.

5. **En enda WatchedItem-tabell för filmer och TV-säsonger**
   Fält: userId, tmdbId, mediaType ('movie'|'tv'), seasonNumber (null
   för filmer), watchedAt. Undviker separata tabeller med duplicerad logik.

6. **TMDB-betyg och personligt betyg visas separat**
   Kombineras eller genomsnittsberäknas aldrig. TMDB-betyg alltid synligt;
   personligt betyg visas endast när den autentiserade användaren har
   betygsatt titeln.

7. **Ny säsong-detektion on-demand**
   När watchlist hämtas kontrollerar backend TMDB för nya säsonger som
   ännu inte är märkta som sedda. Ingen bakgrundsjobb eller cron —
   enklare infrastruktur för MVP. Dokumenterat som framtida utvidgning
   (push-notiser).

8. **Flerspråkigt: backend tar emot lang-parameter, skickar vidare till TMDB**
   Fallback till en-US om TMDB returnerar tom beskrivning för begärt
   språk. Frontend mappar i18n-locale till TMDB-språkkod (en→en-US,
   es→es-ES, sv→sv-SE) via delad typ i packages/types.

**Datamodell definierad:**
User, UserCountry, StreamingService, UserStreamingService, WatchlistItem, WatchedItem & UserRating.

Fullständig entitetsdesign genomförs i dbdiagram.io (ticket #13, vecka 1).

**Sommarplan reviderad:**
Identifierade gap i ursprunglig plan och reviderade vecka 1–8:

- Lade till dedikerad session för datamodelldesign (vecka 1, torsdag)
- Flyttade Figma-wireframes till vecka 2 (före frontend-kodning, inte
  samma dag)
- Lade till Tailwind CSS-setup i vecka 1
- Utökade Better Auth till 2 dagar (vecka 2)
- Lade till Zod för frontend-validering i vecka 4

**GitHub-setup:**

- Skapade repo: `foundit-fullstack` (MIT-licens)
- Skapade `LOGGBOK.md` i repo-roten
- Skapade GitHub Project med 79 detaljerade backlog-tickets fördelade
  på 12 kategorier (Design, Infra, Backend Setup, Backend TMDB,
  Backend User Data, Backend Tests, Frontend Setup, Frontend Publika
  sidor, Frontend Autentiserade sidor, Frontend Komponenter,
  Frontend Tests, Docs)
- Varje ticket innehåller: beskrivning, acceptanskriterier, prioritet
  (Critical/High/Medium/Low), storlek (S/M/L/XL), milestone (Vecka 3–10)

#### Beslut

| Beslut                              | Motivering                                         |
| ----------------------------------- | -------------------------------------------------- |
| API-first (backend som enda källa)  | Framtida React Native-app använder samma API       |
| Endast TMDB v3                      | Egen DB för användardata, inget TMDB-kontoberoende |
| Highlights i backend                | Affärslogik på serversidan, klientagnostisk        |
| Historik på säsongsnivå (ej episod) | Enkel modell, tillräcklig UX                       |
| En enda WatchedItem-tabell          | Undviker duplicerad logik för film/TV              |
| On-demand ny säsong-detektion       | Ingen infrastrukturkomplexitet för MVP             |
| Separata TMDB + personliga betyg    | Måtten tjänar olika syften                         |

#### Nästa steg

- [ ] Tisdag 30/6: Setup av monorepo med pnpm workspaces (#21)
- [ ] Onsdag 1/7: Docker Compose + Express & TypeScripts in apps/api (#22, #27)
- [ ] Torsdag 3/7: Datamodelldesign + Prisma-schema (#13, #28)

#### Resurser

- [TMDB API v3 — dokumentation](https://developer.themoviedb.org/docs)
- [TMDB append_to_response](https://developer.themoviedb.org/docs/append-to-response)
- [Better Auth — Express-guide](https://www.better-auth.com/docs/integrations/express)
- [dbdiagram.io](https://dbdiagram.io)
- [pnpm workspaces](https://pnpm.io/workspaces)

---

### Tisdag 30/6 – Monorepo setup, delade typer och Tailwind CSS

#### Vad jag gjorde

Slutförde ticket #21 (monorepo med pnpm workspaces) och ticket #23
(Tailwind CSS i apps/web) — båda genomförda samma dag.

**Monorepo-struktur:**

```
foundit-fullstack/
├── apps/
│   ├── web/          ← Nuxt 4 frontend
│   └── api/          ← Express backend
├── packages/
│   └── types/        ← Delade TypeScript-typer
├── pnpm-workspace.yaml
├── package.json      ← Rotskript
└── tsconfig.base.json
```

**packages/types (@foundit/types):**

- `media.ts` — MediaType, ProviderType, Provider, Genre, Country,
  NormalizedSearchResult, PaginatedResponse
- `user.ts` — User, UserProfile, WatchlistItem, WatchedItem, UserRating
- `i18n.ts` — SupportedLocale, LOCALE_TO_TMDB_LANG
- `api.ts` — ApiSuccess\<T\>, ApiError, ApiResponse\<T\>
- `index.ts` — barrel file som exporterar allt

Paketet länkas internt med `workspace:*`-protokollet och verifierades
fungera genom att importera `LOCALE_TO_TMDB_LANG` i apps/api.

**apps/api:**

Express + TypeScript med `tsx watch` för hot reload. GET / endpoint
bekräftar att servern svarar och att workspace-länken till
`@foundit/types` fungerar korrekt.

**apps/web:**

Nuxt 4 initialiserat med minimal mall. `@nuxtjs/tailwindcss` installerat
och registrerat i `nuxt.config.ts`.

#### Beslut

| Beslut                                                 | Motivering                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `workspace:*` för interna paket                        | pnpm löser alltid till lokal version i monorepon            |
| `devDependencies` för @types, tsx, nodemon, typescript | Behövs inte i produktion — Railway kör `node dist/index.js` |
| `strict: true` i tsconfig.base.json                    | Konsekvent typstrikhet ärvt av alla paket                   |
| `allowBuilds` i pnpm-workspace.yaml                    | Eliminerar warnings om ej godkända installationsskript      |

#### Problem och lösningar

| Problem                                   | Orsak                                   | Lösning                                                          |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `Cannot find module '@foundit/types'`     | Saknade explicit deklaration i apps/api | `pnpm add @foundit/types --filter foundit-api --workspace`       |
| `Unexpected token "/"` vid pnpm-kommandon | Jsonc-kommentarer i package.json        | Tog bort alla `//`-kommentarer — standard JSON tillåter dem inte |
| `@types/express` i `dependencies`         | Felaktig placering                      | Flyttad till `devDependencies`                                   |
| `"main": "src/index.js"`                  | Pekade på fel katalog                   | Korrigerat till `"dist/index.js"`                                |

#### Nästa steg

- [ ] Onsdag 1/7: Docker Compose PostgreSQL (#22)
- [ ] Torsdag 3/7: Express + TypeScript struktur (#27) +
      datamodelldesign + Prisma-schema (#13, #28)

#### Commits

- `chore: setup monorepo with pnpm workspaces` — closes #21
- `chore: setup tailwind css` — closes #22

#### Resurser

- [pnpm workspaces](https://pnpm.io/workspaces)
- [pnpm workspace protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)
- [Nuxt 4 — Getting Started](https://nuxt.com/docs/getting-started/installation)
- [Tailwind CSS + Nuxt](https://tailwindcss.nuxtjs.org/)

---

### Onsdag 1/7 — Docker Compose PostgreSQL

#### Vad jag gjorde

Slutförde ticket #22: Docker Compose med PostgreSQL 16 för lokal
utveckling.

**Konfiguration:**

- `docker-compose.yml` med PostgreSQL 16 Alpine-image
- Named volume `postgres_data` för datapersistens mellan omstarter
- Health check med `pg_isready` — containern rapporterar `healthy`
  först när databasen är redo att ta emot anslutningar
- `.env.example` med alla nödvändiga miljövariabler dokumenterade
- Rotskript tillagda i `package.json`:
  `db:up`, `db:down`, `db:reset`, `db:logs`

**Verifiering:**

```bash
docker compose ps
# NAME               STATUS
# foundit-postgres   Up (healthy)

docker exec -it foundit-postgres psql -U foundit -d foundit_db -c "\l"
# foundit_db synlig i listan
```

#### Beslut

| Beslut                               | Motivering                                                     |
| ------------------------------------ | -------------------------------------------------------------- |
| PostgreSQL 16 Alpine                 | Minimal image-storlek, tillräckligt stabil                     |
| Named volume istället för bind mount | Bättre prestanda och portabilitet                              |
| Health check med pg_isready          | Säkerställer att Prisma inte försöker ansluta innan DB är redo |
| restart: unless-stopped              | Containern startar om automatiskt efter systemomstart          |

#### Commits

- `chore: add docker compose for postgresql` — closes #10

#### Resurser

- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Docker Compose health checks](https://docs.docker.com/compose/how-tos/startup-order/)

---

### Torsdag 2/7 — Express + TypeScript setup med Zod-validering

#### Vad jag gjorde

Slutförde ticket #27: komplett Express + TypeScript-setup i apps/api
med produktionsklar struktur.

**Mappstruktur skapad:**

```
apps/api/src/
├── controllers/    ← request handlers (tomma, fylls i kommande tickets)
├── lib/            ← Prisma-klient, TMDB-klient, Better Auth (kommande)
├── middleware/     ← auth, error, logging (kommande)
├── routes/         ← Express-routrar per domän (kommande)
├── services/       ← affärslogik (kommande)
└── index.ts        ← app entry point
```

**Miljövariabelvalidering med Zod:**

Alla nödvändiga env-variabler valideras vid uppstart via ett Zod-schema.
Om en variabel saknas eller har fel format kraschar appen omedelbart
med ett beskrivande felmeddelande — istället för att misslyckas senare
vid runtime.

```typescript
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
```

**Middleware:**

- `helmet()` — HTTP security headers
- `cors()` med `origin: env.FRONTEND_URL` och `credentials: true`
- `express.json()` — JSON body parser

**Endpoints:**

- `GET /health` — returnerar `{ status, timestamp, environment }`
- `GET /` — verifierar workspace-länk till `@foundit/types`

**Felhantering:**

- 404-handler för okända rutter — returnerar `ApiError`-format
- Global error handler — döljer stack trace i produktion

#### Beslut

| Beslut                              | Motivering                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| Zod för env-validering vid startup  | Fail fast — bättre att krascha direkt än vid runtime           |
| `dotenv` laddar från monorepo-roten | En enda `.env`-fil för hela projektet                          |
| `ApiError`-format i felhanterare    | Konsekvent med `ApiResponse<T>` från `@foundit/types`          |
| Mappstruktur definierad nu          | Undviker refaktorisering när routes och controllers läggs till |
| `cors: credentials: true`           | Nödvändigt för HTTP-only cookies (Better Auth)                 |

#### Problem och lösningar

| Problem                            | Orsak                           | Lösning                                             |
| ---------------------------------- | ------------------------------- | --------------------------------------------------- |
| `__dirname` undefined i ES Modules | ES Modules har inte `__dirname` | `fileURLToPath(import.meta.url)` + `path.dirname()` |

#### Commits

- `feat: setup express backend with zod env validation and shared types` — closes #15

#### Resurser

- [Express 5 — Getting Started](https://expressjs.com/en/5x/api.html)
- [Zod — Environment variables](https://zod.dev)
- [ES Modules — \_\_dirname equivalent](https://nodejs.org/api/esm.html#importmetaurl)

---

### Databas model

## Data Model

The database schema is defined in [dbdiagram.io](https://dbdiagram.io) and exported as an image in `/docs/data-model.png`.

- **Better Auth Tables**: Managed by Better Auth (user, session, account, verification).
- **FoundIt Tables**: Custom tables for the application (UserCountry, UserStreamingService, WatchlistItem, WatchedItem, UserRating).

![Databas model diagram](https://github.com/JoseRaul-TR/foundit-fullstack/blob/800827dd615182fd5c9d9605b39b992a28db681d/docs/data-model.png)

---

### Fredag 3/7 — Datamodelldesign i dbdiagram.io

#### Vad jag gjorde

- Slutförde **Ticket #13**: Designade den fullständiga datamodellen för FoundIt i [dbdiagram.io](https://dbdiagram.io).
- Exporterade diagrammet som `docs/data-model.png` och lade till DBML-koden i `docs/data-model.dbml`.
- Dokumenterade alla entiteter: **User, UserCountry, StreamingService, UserStreamingService, WatchlistItem, WatchedItem, UserRating**.
- Validerade att modellen matchar kraven för:
  - **API-first-arkitektur**: Backend som enda datakälla för TMDB-anrop.
  - **Säsongsnivå för historik**: `WatchedItem` med `seasonNumber` (null för filmer).
  - **Kaskadborttagning**: `onDelete: Cascade` för alla relationer till `User`.
  - **Unika index**: `(userId, tmdbId, mediaType)` för `WatchlistItem` och `(userId, tmdbId, mediaType, seasonNumber)` för `WatchedItem`.
  - Slutförde **Ticket #28**: Setup av Prisma schema och migrationer.
- Installerade `prisma` och `@prisma/client` i `apps/api`.
- Skapade `prisma/schema.prisma` med alla modeller baserade på datamodellen från dbdiagram.io:
  - **Better Auth-modeller**: `User`, `Session`, `Account`, `Verification`.
  - **FoundIt-modeller**: `UserCountry`, `StreamingService`, `UserStreamingService`, `WatchlistItem`, `WatchedItem`, `UserRating`.
- Konfigurerade `prisma.config.ts` för att ladda miljövariabler från monorepo-roten.
- Lade till **kaskadborttagning** (`onDelete: Cascade`) och **unika index** för alla relationer.
- Körde `prisma migrate dev --name init` för att skapa tabellerna i PostgreSQL.
- Genererade Prisma-klienten med `prisma generate`.
- Skapade `lib/prisma.ts` som en singleton för att undvika flera instanser av `PrismaClient`.
- Testeade anslutningen till databasen via `prisma.$connect()` i `index.ts`.

#### Beslut

| Beslut                                 | Motivering                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **En enda `WatchedItem`-tabell**       | Undviker duplicerad logik för filmer och TV-serier. `mediaType` + `seasonNumber` (nullable) hanterar båda fallen. |
| **Kaskadborttagning**                  | Automatisk rensning av relaterade data (t.ex. `UserCountry`, `WatchlistItem`) när en användare tas bort.          |
| **Unika index**                        | Förhindrar duplicerade poster i `WatchlistItem` och `WatchedItem`.                                                |
| Beslut                                 | Motivering                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------                                                   |
| **`prisma-client-js` som provider**    | Kompatibel med Prisma 7 och TypeScript ES Modules.                                                                |
| **`@prisma/adapter-pg`**               | Nödvändigt för Prisma 7 för att ansluta till PostgreSQL.                                                          |
| **Singleton-mönster för PrismaClient** | Undviker minnesläckor och flera anslutningar i utvecklingsläge.                                                   |

#### Problem och lösningar

| Problem                                 | Orsak                                                     | Lösning                                                                             |
| --------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Osäkerhet om datamodellens granularitet | Behov av balans mellan komplexitet och användarupplevelse | Valde säsongsnivå för historik (istället för episodnivå) för att förenkla modellen. |

| Problem                                    | Orsak                                     | Lösning                                                                                    |
| ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL undefined` i `lib/prisma.ts` | `.env` laddades inte i ES Modules-kontext | Laddade `dotenv` i `src/config/env.ts` och importerade `env` i `prisma.ts`.                |
| `SASL: SCRAM-SERVER-FIRST-MESSAGE`         | Felaktig lösenordsformatering i `Pool`    | Använde `new URL(env.DATABASE_URL)` för att korrekt extrahera användarnamn, lösenord, etc. |
| `PrismaClientConstructorValidationError`   | Saknade `adapter` i Prisma 7              | Lade till `PrismaPg`-adapter med `Pool` från `pg`.                                         |

#### Commits

- `docs: add data model diagram from dbdiagram.io` — closes #13
- `feat(api): setup Prisma schema and migrations` — closes #28

#### Resurser

- [dbdiagram.io](https://dbdiagram.io)
- [TMDB API v3 — Dokumentation](https://developer.themoviedb.org/docs)
- [Prisma v7 — Quickstart](https://www.prisma.io/docs/prisma-orm/quickstart/postgresql)
- [Prisma Adapters](https://www.prisma.io/docs/orm/prisma-client/deploy/edge#using-prisma-client-with-edge-functions)

---

## Vecka 2 (6–9 juli 2026)

### Måndag 6/7 — Seed-skript med testdata

#### Vad jag gjorde

- Slutförde **Ticket #29**: Skapade seed-skript med realistisk testdata för lokal utveckling.
- Skapade `prisma/seed.ts` med följande data:
  - **2 testanvändare**:
    - `testuser1@foundit.dev` (lösenord: `test1234`).
    - `testuser2@foundit.dev` (lösenord: `test5678`).
  - **Streamingtjänster** med TMDB-provider-ID:
    - Netflix (8), Disney+ (337), HBO Max (384), Amazon Prime (119), Apple TV+ (350), Paramount+ (531).
  - **Användarinställningar**:
    - `testuser1`: Länder `ES` och `SE`, prenumerationer på Netflix och Disney+ i båda länderna.
    - `testuser2`: Land `DE`, prenumeration på Amazon Prime i `DE`.
  - **Watchlist för `testuser1`**:
    - 3 filmer (TMDB-ID: 1, 2, 3).
    - 2 TV-serier (TMDB-ID: 1399, 1400).
  - **Historik för `testuser1`**:
    - 2 filmer (TMDB-ID: 1, 2) markerade som sedda.
    - 1 TV-serie (TMDB-ID: 1399) med säsong 1 markerad som sedd.
  - **Betyg för `testuser1`**:
    - Film 1: 8/10.
    - Film 2: 7/10.
- Implementerade **upsert-mönster** för att undvika duplicerade poster vid omkörning av seed-skriptet.
- Lade till skriptet `pnpm seed` i `package.json` för `apps/api`:
  ```json
  "seed": "tsx prisma/seed.ts"
  ```

---

### Tisdag 7/7 — Better Auth: e-post/lösenord (del 1)

#### Vad jag gjorde

Påbörjade Better Auth-integrationen (e-post/lösenord) i apps/api:

- Installerade `better-auth` och skapade `lib/auth.ts` med Prisma-adapter,
  e-post/lösenord-provider, sessionskonfiguration (7 dagars expiry,
  24h updateAge, 5 min cookieCache) och `trustedOrigins: [FRONTEND_URL]`.
- Monterade auth-handlern i Express via `toNodeHandler(auth)`.
- Skapade `requireAuth`-middleware (401 utan giltig session) och
  `extractSession`-hjälpare.
- `useSecureCookies` aktiveras endast i produktion — lokalt körs http.

#### Beslut

| Beslut                                        | Motivering                                        |
| --------------------------------------------- | ------------------------------------------------- |
| Adapter från `better-auth/adapters/prisma`    | Inbyggd i better-auth — inget separat paket finns |
| Auth-handlern monteras FÖRE `express.json()`  | Better Auth kräver rå (oparsead) request body     |
| `trustedOrigins` istället för origin-check av | Dokumenterad, säker konfiguration                 |

#### Problem och lösningar

| Problem                                            | Orsak                                                    | Lösning                                   |
| -------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `Cannot find module '@better-auth/prisma-adapter'` | Paketet finns inte på npm                                | Import från `better-auth/adapters/prisma` |
| Sign-up/sign-in misslyckades tyst                  | `express.json()` konsumerade bodyn före auth             | `toNodeHandler(auth)` monterad först      |
| Krasch på `app.all("/api/auth/*")`                 | Express 5 (path-to-regexp v8) kräver namngivna wildcards | Mönstret `"/api/auth/*splat"`             |

#### Nästa steg

- [ ] Typning av session + manuella endpoint-tester

---

### Onsdag 8/7 — Better Auth: e-post/lösenord (del 2)

#### Vad jag gjorde

- Löste typningen: `AuthSession` härleds direkt från auth-instansen med
  `NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>` —
  håller sig automatiskt i synk med Better Auth.
- Skapade `src/types/express.d.ts` med module augmentation så att
  `req.session` är korrekt typad (ersätter `(req as any)`).
- Fixade dotenv-buggen i `config/env.ts`: sökvägen till monorepo-rotens
  `.env` kräver fyra nivåer upp från `src/config/`, inte två.
- Testade manuellt med curl: sign-up, sign-in (cookie), get-session,
  skyddad route utan cookie (401), sign-out. Alla acceptanskriterier
  för e-post/lösenord uppfyllda.

#### Problem och lösningar

| Problem                                      | Orsak                                                                | Lösning                               |
| -------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------- |
| ZodError: alla env-variabler `undefined`     | `env.ts` laddade `../../.env` (2 nivåer) — filen ligger 4 nivåer upp | `../../../../.env` från `src/config/` |
| TS2339: `'user'` finns inte på sessionstypen | Unionen innehöll `null` — kan inte indexeras                         | `NonNullable<...>` före indexering    |
| `(req as any).session`                       | Ingen typaugmentation för Express Request                            | `src/types/express.d.ts`              |

#### Commits

- `feat(api): setup better auth email/password authentication` — closes #30

---

### Torsdag 9/7 — Google OAuth (del 1)

#### Vad jag gjorde

- Skapade OAuth 2.0-credentials i Google Cloud Console och registrerade
  redirect URI: `http://localhost:3001/api/auth/callback/google`
  (backendens port, http, ingen trailing slash).
- Lade till `socialProviders.google` i auth-konfigurationen och
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` + `BETTER_AUTH_URL` i
  Zod-schemat och `.env.example`.
- Konfigurerade account linking: `accountLinking.trustedProviders:
["google"]` — en Google-inloggning med samma verifierade e-post
  länkas till befintlig e-post/lösenord-användare.

#### Problem och lösningar

| Problem                               | Orsak                                                   | Lösning                                                                                 |
| ------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Error 400: redirect_uri_mismatch`    | URI:n var inte registrerad i Google Cloud Console       | Exakt URI registrerad (port 3001, http)                                                 |
| 404 på `GET /api/auth/sign-in/google` | Rutten finns inte — sociala flöden initieras annorlunda | `POST /api/auth/sign-in/social` med `{"provider":"google"}` returnerar Googles auth-URL |

---

## Vecka 3 (13–16 juli 2026)

### Måndag 13/7 — pnpm-haveri, Prisma-klienten och graceful shutdown

#### Vad jag gjorde

Dagen dominerades av ett totalt pnpm-haveri: varje kommando i repot
kraschade med `Cannot use 'in' operator to search for 'integrity' in
undefined` — även `pnpm help`. Felsökningen eliminerade lockfilen och
node_modules som orsak (felet kvarstod efter fullständig radering).

**Rotorsak (reproducerad i ren sandbox):** `devEngines.packageManager`
pekade på pnpm 11.12.0 medan den globala binären var 11.9.0. Den
automatiska versionsnedladdningen (`onFail: "download"`) körs före
varje kommando i workspacet, och 11.9.0:s nedladdare kraschar specifikt
vid upplösning av 11.12.0 (11.10.0 och 11.11.0 fungerar). Att `pnpm
store prune` fungerade var vilseledande — store-kommandon går inte via
versionsbytet.

**Fix:** uppdaterade den globala pnpm-installationen till 11.12.0 via
standalone-installationsskriptet. Regenererade lockfilen.

Övrigt:

- `prisma generate` krävs efter varje node_modules-radering —
  `allowBuilds: prisma: false` blockerar automatisk generering.
  Återställde ett felaktigt workaround-import (`@prisma/client/extension`).
- Implementerade graceful shutdown i `index.ts`: SIGINT/SIGTERM →
  `server.close()` + `server.closeIdleConnections()` +
  `prisma.$disconnect()` + `pool.end()`, med 10s force-exit-timeout.
  Viktigt för Railway-deploys (SIGTERM vid ny release).
- Rensade oanvända beroenden: `nodemon`, `@better-auth/prisma-adapter`,
  `concurrently`.
- Första OAuth-testet i webbläsaren gav `state_mismatch` — flödet hade
  initierats med curl, så Better Auths state-cookie fanns aldrig i
  webbläsaren.

#### Problem och lösningar

| Problem                                                | Orsak                                                              | Lösning                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Alla pnpm-kommandon kraschade i repot                  | Bugg i pnpm 11.9.0:s versionsnedladdare vid mål 11.12.0            | Global pnpm → 11.12.0; håll global == devEngines-pin            |
| `@prisma/client has no exported member 'PrismaClient'` | Genererad klient raderades med node_modules; auto-build blockerad  | `pnpm --filter foundit-api db:generate` efter varje ren install |
| Editor-fel (`helmet` saknas, `req.headers` finns inte) | Stale TS server efter ny node_modules (CLI kompilerade rent)       | Restart TS Server i VS Code                                     |
| `state_mismatch` i OAuth-callback                      | Flödet initierat med curl — state-cookien nådde aldrig webbläsaren | Initiera flödet från webbläsaren                                |

---

### Tisdag 14/7 — Google OAuth slutförd, error handler och security middleware

#### Vad jag gjorde

**Google OAuth i mål (#31).** Gårdagens kvarstående `state_mismatch`
berodde på att jag återanvände en dagsgammal Google-URL — OAuth-state
är engångs och lever bara några minuter (loggen visar hur utgångna
verification-rader purgas precis före felet).

**Korrekt manuellt testflöde** (samma som Nuxt-klienten kommer använda):

1. Nuxt dev igång på :3000
2. Från webbläsarkonsolen på `localhost:3000`:
   `fetch("http://localhost:3001/api/auth/sign-in/social", { method:
"POST", credentials: "include", ... })` → state-cookien hamnar i
   webbläsaren
3. `window.location.href = url` → Google-inloggning → callback →
   redirect till :3000

**Verifiering av acceptanskriterier:**

- ✅ `POST /sign-in/social` returnerar Googles auth-URL
- ✅ Callback skapar user + account (`providerId = "google"`) — verifierat
  i Prisma Studio
- ✅ Sessionscookie satt; `GET /api/auth/get-session` returnerar användaren
- ✅ Account linking konfigurerad via `trustedProviders`

Autentiseringslagret är därmed komplett: e-post/lösenord + Google OAuth.

Notering: sessionsrutten heter `/api/auth/get-session`, inte
`/api/auth/session` som ticketen angav — ticketen korrigerad.

**Seed-refaktorering.** Användare skapas nu via `auth.api.signUpEmail`
istället för `prisma.user.create` — testkontona får korrekt
lösenordshash (scrypt) och account-rad, och kan faktiskt logga in.
Skriptet är självläkande: gamla seed-användare utan credentials
raderas (cascade) och återskapas korrekt. Bytte `process.exit(1)` mot
`process.exitCode = 1` så att `.finally()` hinner stänga
DB-anslutningarna vid fel.

**Centraliserad felhantering (#33).** Skapade
`middleware/errorHandler.ts`:

- `AppError`-klass med `statusCode`, `code` och `isOperational`
- En enda `sendError`-funktion — alla felsvar formateras på ett ställe
- Mappning: Prisma P2002 → 409, P2025 → 404, ZodError → 400 med
  fältdetaljer (`details[]`, tillagt i `ApiError` i @foundit/types)
- Okända fel → 500; stack trace loggas, detaljer döljs i produktion
- `notFoundHandler` ersätter inline-404:an och routar via samma handler
- `requireAuth` refaktorerad: `next(new AppError("Unauthorized", 401))`
- Express 5 vidarebefordrar rejected promises automatiskt — inget
  `asyncHandler`-wrapper behövs i kommande controllers

**Security middleware (#32).** Skapade `middleware/rateLimit.ts` med
tre limiters via `express-rate-limit`: global (100 req/15 min), auth
(10 req/15 min, monterad före Better Auth-handlern) och tmdb
(30 req/min, exporterad — appliceras när TMDB-rutterna finns).
429-svaren routas genom den centrala felhanteraren (ApiError-shape).
Dev-gränser är 10x för att inte låsa ute lokal testning. CORS
kompletterad med explicit metodlista. `app.set("trust proxy", 1)`
tillagt — utan det skulle alla användare bakom Railways proxy dela
samma rate-limit-bucket.

#### Beslut

| Beslut                                     | Motivering                                                           |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Seed-användare via Better Auth API         | Hash + account-rad korrekta by construction — aldrig manuella hashar |
| En enda felformateringspunkt (`sendError`) | Konsekvent ApiError-shape över alla endpoints, inkl. 429             |
| `isOperational`-flagga på AppError         | Skiljer förväntade fel (litas på) från buggar (alltid 500)           |
| Dev-rate-limits 10x                        | OAuth-testning skulle annars låsa ute mig själv                      |
| `trust proxy: 1`                           | Korrekt klient-IP bakom Railways reverse proxy                       |

#### Problem och lösningar

| Problem                                                 | Orsak                                                                    | Lösning                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `state_mismatch` trots webbläsarflöde                   | Gårdagens Google-URL återanvänd — state är engångs med kort TTL          | Hela flödet i en session, gamla flikar stängda                   |
| 404 på `GET /api/auth/session`                          | Rutten heter `get-session` i Better Auth                                 | `GET /api/auth/get-session`; ticket uppdaterad                   |
| `ReferenceError: message is not defined` i errorHandler | Parametern `message` föll bort ur `sendError`-signaturen vid inklistring | Återställde 5-parameterssignaturen; TS-felen pekade på samma rot |
| Express default-handler svarade HTML                    | errorHandler kraschade själv → Express föll tillbaka                     | Fixad signatur; verifierat JSON-shape med curl + jq              |

#### Commits

- `feat(api): add google oauth provider with account linking` — closes #31
- `fix(api): create seed users through better auth so test accounts can sign in`
- `feat(api): add centralized error handler with AppError` — closes #33
- `feat(api): add security middleware with rate limiting` — closes #32

#### Nästa steg

- [ ] TMDB-service: klient i `lib/`, första publika endpoints (search)
- [ ] Uppdatera DEVLOG 6/7: seed-lösenorden gäller från dagens refaktorering

---

### Onsdag 15/7 — TMDB-klient, film- och seriedetalj, TypeScript 7-migration

#### Vad jag gjorde

**TMDB-klient (#34).** `lib/tmdb.ts`: `fetchTmdb` (Bearer-auth, 10s
timeout → AppError 503, non-2xx → AppError 404/502) och
`fetchTmdbWithFallback` (andra anrop till en-US endast om
overview/biography är tomt, sedan merge som bevarar översatt titel).
`LOCALE_TO_TMDB_LANG` fanns redan i `i18n.ts` sedan tidigare — undvek
en dubblettfil i packages/types.

**Filmdetalj — GET /api/movies/:id (#38).** `services/movies.ts` +
`routes/movies.ts`. Valfri autentisering (`extractSession`, ingen
401 utan session). Normalisering av trailer (första YouTube-trailern),
cast (max 10), providers per land (flatrate/rent/buy/free,
`subscribed: true` vid matchning mot användarens tjänster),
recommendations (max 10). Verifierat manuellt med curl: sv/es/en-
fallback fungerar korrekt.

**TypeScript 7.0.2 + verbatimModuleSyntax.** Uppgraderade från 6.0.3
(redan senaste i 6.x-grenen — ingen mindre uppdatering fanns).
`baseUrl` (borttaget i TS7) ersatt med `paths: {"*": ["./*"]}` i
`apps/api/tsconfig.json` — identisk upplösning av `"src/..."`-importer
utan att röra en enda importrad. Tog samtidigt bort `rootDir`/`outDir`,
vilket löste en `TS6059`-bugg (`@foundit/types` exporterar rå
källkod, inte `dist`, vilket kolliderade med `rootDir`).
`verbatimModuleSyntax` krävde `type`-only-annotering på 4 ställen
(`index.ts`, `errorHandler.ts`, `rateLimit.ts`, `movies.ts`). Efter
`pnpm install` försvann den genererade Prisma-klienten — kör
`db:generate` efter varje ren install; bör läggas till som
`postinstall`-script.

**Seriedetalj — GET /api/series/:id (#39), döpt om från "tv".**
Extraherade delad normaliseringslogik (trailer/cast/providers/
recommendations) från `movies.ts` till `helpers/tmdbMedia.helpers.ts`
för att undvika dubblering inför sök/discover/people. Nytt jämfört
med filmdetalj: `seasons`-lista med per-säsong `watched`-flagga,
förenklad `returning`/`ended`-status, samt `newSeasonsAvailable` +
`availableOn` (jämför användarens senast sedda säsong mot TMDB:s
`numberOfSeasons`, korsreferens mot prenumererade tjänster).

**Namnbyte tv → series.** Beslutade att döpa om all
TV-relaterad kod i vår egen kodbas till "series" — typer, funktioner,
filnamn, rutter, `mediaType`-värden. TMDB:s egna fält/endpoints
(`/tv/:id`, `TmdbTVShow`) förblir oförändrade, det är externt API.

**API-skydd — diskussion, ingen kod idag.** Övervägde att begränsa
API:t till enbart foundit-web/foundit-mobile. Slutsats: omöjligt att
göra kryptografiskt säkert för publika endpoints (movies/series/
search/discover måste fungera oautentiserat per ticket-krav) — vilket
hemligt värde en publik klient än håller kan kopieras från
devtools/en dekompilerad app. Nuvarande skydd (CORS + rate limiting +
sessionsautentisering för användardata) räcker för nu. BFF-mönster
(Nuxt SSR proxyar publika sidor server-till-server med en riktig
hemlighet) noterat som framtida arkitekturbeslut när apps/web byggs
(vecka 6).

#### Beslut

| Beslut                                                   | Motivering                                                                                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths: {"*": ["./*"]}` istället för `baseUrl`           | TS7 tog bort `baseUrl` helt; officiellt föreslagen ersättning, ingen importrad behövde ändras                                                      |
| Ta bort `rootDir`/`outDir` i apps/api/tsconfig.json      | Löste `TS6059` (`@foundit/types` pekar på rå `src`, inte `dist`) samtidigt som TS7-migrationen                                                     |
| `verbatimModuleSyntax: true`                             | Tvingar explicit `type`-import, fångar misstag tidigt, standardpraxis i ESM+bundler-projekt                                                        |
| Delad `tmdbMedia.helpers.ts` istället för duplicerad kod | DRY — sök/discover/people kommer behöva samma normalisering                                                                                        |
| `newSeasonsAvailable` kräver minst en sedd säsong        | Ticketens bokstavliga tolkning (max sedd säsong = 0 om aldrig sedd) skulle visa badge för alla returning shows oavsett om användaren följer serien |
| tv → series namnbyte i egen kod                          | Konsekvens i kodbasen — dokumenterat som kriterium för alla framtida tickets                                                                       |
| Inget API-skydd utöver CORS/rate limiting nu             | Publika endpoints kan inte skyddas kryptografiskt; BFF-mönster kräver en Nuxt-server som inte finns än                                             |

#### Problem och lösningar

| Problem                                                      | Orsak                                                                                                       | Lösning                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| URL-typo i `lib/tmdb.ts` (`themoviewdb`)                     | Skrivfel vid första implementation                                                                          | Korrigerat till `themoviedb.org`                                 |
| Saknad `<` i `AuthSession`-typen (`lib/auth.ts`)             | Copy-paste-fel                                                                                              | `NonNullable<Awaited<...>>` korrigerad                           |
| `tmbLimiter`-typo i `rateLimit.ts`                           | Skrivfel                                                                                                    | Omdöpt till `tmdbLimiter`, konsekvent i `index.ts`               |
| `TS6059` rootDir-fel vid `pnpm typecheck`                    | `@foundit/types` package.json `exports` pekar på rå `src/index.ts`, kolliderar med apps/api:s `rootDir`     | Tog bort `rootDir`/`outDir`                                      |
| `PrismaClient`/`Prisma` saknade exports efter `pnpm install` | Genererad klient (`.prisma/client`) rensas vid ren install, ingen auto-generate                             | `pnpm --filter foundit-api db:generate`                          |
| "Missing or null Origin" vid test av sign-in i Postman/curl  | Better Auths CSRF-skydd kräver `Origin`-header; testverktyg skickar den inte automatiskt som webbläsare gör | `Origin: http://localhost:3000` tillagd manuellt i test-requests |

#### Commits

- `feat(api): add TMDB client with fetchTmdbWithFallback` — closes #34
- `feat(api): add GET /api/movies/:id detail endpoint` — closes #38
- `chore: upgrade to TypeScript 7.0.2, enable verbatimModuleSyntax`
- `feat(api): add GET /api/series/:id detail endpoint, rename tv to series` — closes #39

#### Nästa steg

- [ ] Uppdatera `packages/types/src/media.ts`: `MediaType` "tv" → "series" (kolla även WatchlistItem/WatchedItem/UserRating i user.ts)
- [ ] `pnpm db:reset` + reseed — gamla rader med `mediaType: "tv"` matchar inte längre
- [ ] GET /api/search (#35) eller /api/discover (#36/#37)

#### Resurser

- [TMDB append_to_response](https://developer.themoviedb.org/docs/append-to-response)
- [TypeScript 7 release notes — baseUrl removal](https://devblogs.microsoft.com/typescript/)
- [verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax)

---

### Torsdag 16/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vad jag gjorde**        | Slutförde och committade #36/#37 (GET /api/discover/movies och /api/discover/series). Hittade och fixade en riktig bugg i routes/discover.ts: `const router = Router;` saknade anropet (`Router()`), vilket orsakade 6 kompileringsfel. Diagnostiserade varför VSCode:s auto-import föreslog typer från node_modules istället för `@foundit/types` — orsaken var den breda wildcard-mappningen `"paths": { "*": ["./*"] }` i apps/api/tsconfig.json, som fångade upp alla bare specifiers, inklusive npm-paket. Verifierade med `tsc --traceResolution` och satte samtidigt upp en riktig path alias `@/*` → `./src/*`, och bytte ut alla `"src/..."`-imports i hela apps/api/src. Implementerade och verifierade #40 (GET /api/series/:id/season/:n) och #41 (GET /api/people/:id). |
| **Beslut**                | Statusfiltret i discover/series förblir tre värden (returning/ended/canceled) tills TMDB:s `with_status`-beteende för flera koder kan testas live — TMDB var nere (504 CloudFront-fel) under sessionen. Path alias-konventionen i apps/api är nu `@/*` istället för bare `"src/..."`. I #41 heter svarsfältet `seriesCredits`, inte det bokstavliga `tvCredits` som ticketen anger — följer tv→series-konventionen eftersom det är vårt eget svarskontrakt, inte TMDB:s råa fältnamn.                                                                                                                                                                                                                                                                                                |
| **Problem och lösningar** | `Router()` saknade anrop → 6 kompileringsfel → fixat. Wildcard paths-mönster orsakade förvirrad auto-import → smalnade av till `"src/*"`/`"@/*"`, verifierat att `@foundit/types`, `zod` m.fl. inte längre matchar mönstret. Upptäckte (ej fixat än, medvetet uppskjutet) att bare `tsc` inte skriver om path aliases i kompilerad kod — `node dist/index.js` skulle krascha med `ERR_MODULE_NOT_FOUND`. Löses med `tsc-alias` inför deploy; inte brådskande då dev körs via `tsx watch`, som hanterar alias direkt. Vid #40 saknades season-funktionen i filen jag fick tillbaka första gången — typecheck var bara "grönt" för att koden inte fanns än; kompletterades och verifierades på nytt.                                                                                   |
| **Commits**               | `feat(api): implement GET /api/discover/movies and /api/discover/series (#36, #37)` · `feat(api): implement GET /api/series/:id/season/:n (#40)` · `feat(api): implement GET /api/people/:id (#41)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Nästa steg**            | Verifiera TMDB:s `with_status`-beteende för flera koder när TMDB är uppe igen, och ta ställning till om "upcoming" ska läggas till i discover/series-filtret. Sätta upp `tsc-alias` (eller motsvarande) inför produktion. Fortsätta med nästa ticket i backloggen (#42, genres).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

### Fredag 17/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vad jag gjorde**        | Verifierade TMDB:s `with_status`-beteende live via Postman (uppskjutet sedan igår): testade enskilda koder (0–5) samt kombinerat med komma och pipe. Bekräftade att pipe fungerar som OR (`1\|2\|5` gav ~4093 träffar, nära summan 4091 av de tre enskilda) och komma som AND (gav 0 träffar, rimligt eftersom en serie inte kan ha tre statusar samtidigt). Lade till "upcoming" som fjärde värde i discover/series statusfilter, mappat till TMDB-koderna `1\|2\|5`. Implementerade och verifierade #42 (genres), #43 (providers) och #44 (countries), med en delad in-memory TTL-cache (lib/cache.ts) som återanvänds av alla tre. La till en ny StreamingService-modell i schema.prisma (katalogtabell för proveedores per land) och körde migrationen. Justerade #44 efter eget önskemål: tog bort den hårdkodade listan av "relevanta" länder och bytte till att hämta alla länder TMDB faktiskt har watch-provider-data för, via `/watch/providers/regions`. Implementerade och verifierade #45 (GET/PUT /api/profile) och #46 (GET/POST/DELETE /api/profile/countries). |
| **Beslut**                | "upcoming" läggs till som fjärde statusvärde i discover/series, mappat till TMDB:s `with_status=1\|2\|5` (Planned/In Production/Pilot). #44 hämtar länder dynamiskt från TMDB istället för en hårdkodad lista — cachen på 7 dagar fungerar redan som den periodiska uppdateringen. StreamingService (katalog) och UserStreamingService (användarens val) kopplas ihop i applikationskod, inte via en hård Prisma-relation/FK — StreamingService är bara en TTL-cachad spegel av TMDB, inte auktoritativ data, så en hård FK hade kunnat blockera giltiga val eller radera användardata vid en framtida cache-städning.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Problem och lösningar** | `prisma.StreamingService` (versalt) → kompileringsfel → rättat till camelCase `prisma.streamingService`. Saknad `/` i en TMDB-sökväg i countries.ts → hade gett trasig URL i produktion, upptäckt innan det nådde runtime. Verifierade med faktiska Postman-anrop mot TMDB att pipe/komma-semantiken för `with_status` stämmer innan koden ändrades, istället för att gissa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Commits**               | `feat(api): add "upcoming" status filter to discover/series (#37)` · `feat(api): implement GET /api/genres, /api/providers, /api/countries (#42, #43, #44)` · `feat(api): implement GET/PUT /api/profile (#45)` · `feat(api): implement GET/POST/DELETE /api/profile/countries (#46)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Nästa steg**            | Fortsätta med nästa ticket i profil-sviten (troligen #47, hantering av användarens streamingtjänster), sedan vidare till #48–51 (watchlist/historik/betyg).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

### Söndag 19/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vad jag gjorde**        | Implementerade och verifierade #48 (GET/POST/DELETE /api/watchlist), #49 (GET/POST/DELETE /api/history för filmer), #50 (GET/POST/DELETE /api/history/seasons för serier) och #51 (GET/POST/DELETE /api/ratings). Innan #48 skrevs, resonerade jag igenom en paginerings-/sorteringsfråga: eftersom watchlist-tabellen bara lagrade `tmdbId`/`mediaType`/`createdAt`, gick det inte att sortera korrekt på titel/år över en paginerad lista utan antingen att berika hela listan vid varje GET (dyrt) eller att denormalisera titel/år till databasen vid skapandet. Valde det senare, lade till nullable `title`/`year`-kolumner på `WatchlistItem` och körde migrationen. #49 och #50 implementerades tillsammans eftersom de delar samma GET-endpoint (`/api/history`, diskriminerad via `type`) — att bygga #49 ensam hade krävt en omskrivning när #50:s helt annorlunda (grupperade) svarsform kom in. #51 fick paginering tillagd i efterhand för att matcha mönstret från #48–#50. |
| **Beslut**                | Titel/år cachas på `WatchlistItem` vid tillägg, inte vid varje läsning — ger korrekt DB-nivå-sortering för alla tre sorteringslägen utan extra TMDB-anrop. `type=series` används i historik-queryn (inte `tv` som ticketens bokstavliga text sa) för konsekvens med resten av kodbasens egen namngivningskonvention. Säsongshistorik (#50) pagineras på antal distinkta serier via Prismas `groupBy`, inte på antal rader — samma typ av korrekthetsproblem som #48 löste för titel/år-sortering. POST-endpoints i #48–#51 returnerar det enskilda skapade/uppdaterade objektet, inte hela den uppdaterade listan, eftersom det senare skulle innebära onödiga extra TMDB-anrop. I #51 mappas `ratedAt` till `updatedAt` (inte `createdAt`), eftersom omvärdering ändrar `rating` utan att ändra när raden först skapades. Ingen separat PUT-route i #51 — ticketens egen "Routes"-sektion definierar bara GET/POST/DELETE, med POST uttryckligen som upsert.                              |
| **Problem och lösningar** | Hittade ett verkligt kompileringsfel i #49: `seasonNumber: null` gick inte att använda i en `upsert`-lookup på det sammansatta unika nyckelfältet, eftersom Postgres behandlar varje NULL i ett unikt villkor som distinkt — en likhets-lookup med NULL kan därför aldrig matcha en befintlig rad. Löste det genom att byta till samma mönster som redan används i `services/movies.ts` (`findFirst` med explicit `seasonNumber: null`-filter, som Prisma översätter till `IS NULL`), följt av villkorad `create`/`update` på `id`. Verifierade all kod mot en handskriven Prisma-klientstub i en isolerad sandbox innan leverans, sedan bekräftat rent med `tsc --noEmit` mot den riktiga kodbasen för samtliga fyra tickets.                                                                                                                                                                                                                                                             |
| **Commits**               | `feat(api): add watchlist endpoints (#48)` · `feat(api): add watch history endpoints for movies and series (#49, #50)` · `feat(api): add personal ratings endpoints (#51)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Nästa steg**            | Gå vidare med nästa del av backloggen (sannolikt testerna #52–55). Uppskjutet sedan tidigare: Postman-testsvit för redan klara endpoints, samt en refactoring av mappstrukturen (undermappar per funktionsområde i services/routes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## Vecka 4 (20–23 juli 2026)

### Måndag 20/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vad jag gjorde**        | Versionerade hela API:et under `/api/v1` (`/health` och `/` förblir oversionerade som infra-endpoints), lade till valfritt HTTPS-stöd för lokal utveckling, och genomförde en refaktorering i tre pass: delade ut gemensam logik i helpers/constants (`getUserId`, `PAGE_SIZE`, återanvändning av `LOCALE_TO_TMDB_LANG`), flyttade alla svarstyper till `packages/types`, och bröt slutligen ut inline route-handlers till ett nytt controllers-lager samtidigt som routes/controllers/services omorganiserades i domänmappar (`catalog/`, `profile/`, `library/`). Delade sedan `index.ts` i `app.ts` (själva Express-appen, utan sidoeffekter) och `server.ts` (listen/HTTPS/graceful shutdown), vilket krävdes för att kunna testa appen med Supertest utan att binda en riktig port. Byggde därefter Vitest + Supertest-infrastruktur: en separat testdatabas (`foundit_test`), en `resetDatabase()`-hjälpfunktion, och en `createTestUser()`-hjälpfunktion byggd på Better Auths officiella `testUtils()`-plugin. Implementerade och verifierade slutligen integrationstester för samtliga fyra kvarvarande tickets: auth-flöden (#52), watchlist (#53), historik (#54) och betyg (#55) — 35 tester totalt, alla gröna mot en riktig Postgres-databas.                                                                                                                                                                                                                                                   |
| **Beslut**                | API-versionering under `/api/v1` valdes framför att lämna API:et oversionerat. HTTPS begränsades uttryckligen till lokal utveckling, eftersom Railway redan terminerar TLS vid sin egen edge. Arkitekturen landade i tre tydliga lager — tunna routes, controllers (HTTP-adapter) och services (ren affärslogik) — organiserade per domän istället för en platt fillista. `createTestUser()` byggdes medvetet i en separat testinstans av Better Auth (inte i produktionens `lib/auth.ts`), enligt Better Auths egen rekommendation, men delar samma databas och `BETTER_AUTH_SECRET` så att sessioner den skapar är giltiga mot den riktiga instansen appen faktiskt använder. TMDB mockas alltid via `vi.mock` på `lib/tmdb.ts`, en enda mockpunkt sedan refaktoreringen. Testdatabasen delar Postgres-instans med utvecklingsdatabasen (egen databas, inte egen container) för att hålla infrastrukturen enkel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Problem och lösningar** | Hittade en verklig bugg i `rateLimit.ts`, oberoende av testerna: `authLimiter` hade `limit: isDev ? 100 : 0` i produktion, vilket skulle blockera all inloggning helt. Rättades till `10`, med tillägg av fullständig bypass av rate limiting när `NODE_ENV=test`, eftersom `express-rate-limit`s minnesbaserade räknare delas över hela testkörningens process. Verifierade Better Auths verkliga endpoint-beteende direkt mot källkoden i `node_modules` istället för att gissa: `GET /session` som ticket #52 bokstavligen efterfrågar finns inte, den riktiga endpointen heter `/get-session`; och "409 vid dubblettregistrering" stämmer inte — Better Auth kastar 422 med vår konfiguration. Hittade samma typ av bugg i två DELETE-endpoints: `removeFromWatchlist` (#53) och `removeRating` (#55) kontrollerade inte om `deleteMany()` faktiskt tog bort något, så DELETE på ett objekt som inte fanns returnerade 200 istället för 404 — rättades i båda. Ett test flakade vid första körningen (sortering på "senast tillagd"): tre snabba `create()`-anrop hann landa inom samma millisekund, och Postgres garanterar ingen deterministisk ordning vid lika `createdAt`. Löstes genom att sätta `createdAt` explicit i testet. Kunde inte köra en riktig Postgres i min egen sandbox (ingen root/Docker), så all kod verifierades där via `tsc --noEmit` mot riktiga versioner av express/zod/better-auth/prisma-typerna, och bekräftades sedan slutgiltigt mot en riktig testkörning i projektet. |
| **Commits**               | `refactor(api): version API under /api/v1, add HTTPS support, and reorganize into domain layers` · `fix(api): correct auth rate limiter production value and bypass rate limiting in test environment` · `test(api): add Vitest + Supertest test infrastructure` · `test(api): add auth integration tests (#52)` · `fix(api): return 404 when removing a non-existent watchlist item (#53)` · `test(api): add watchlist integration tests (#53)` · `test(api): add watch history integration tests (#54)` · `fix(api): return 404 when removing a non-existent rating (#55)` · `test(api): add ratings integration tests (#55)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Nästa steg**            | Ta itu med den försenade backloggen: Figma-wireframes från vecka 2 (#14–20), resterande delar av vecka 3, och planeringen av vecka 4:s frontend-arbete. Postman-testsviten för redan klara endpoints står fortfarande uppskjuten sedan tidigare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

### Tisdag 21/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vad jag gjorde**        | Slutförde wireframe-ticketet för sök- och upptäcktvyerna (#14): byggde bottom sheet för filter på mobil (scrim, drag handle, kondenserade filtergrupper), empty states för Search och Discover (desktop och mobil), en debounce-indikator på sökfältet, och ersatte pagineringskontroller med oändlig scroll inklusive en "Loading more"-indikator. Åtgärdade ett layoutfel i MediaCard-komponenten där overlay-scrimmet och watchlist-ikonen inte skalade korrekt på mobila kortbredder, genom att sätta rätt constraints på huvudkomponenten istället för att patcha varje instans. Höjde kontrasten på watchlist-ikonen och applicerade ett glasigt (halvtransparent) utseende på filterchips, knappar och det aktiva sökfältet. Gjorde en fullständig genomgång av #14 mot den bokstavliga ticket-texten och täppte till kvarvarande luckor: PersonCard saknades i mobilens sökresultat, ingen loading-skeleton fanns för Search, och filterpanelen på mobil saknade Year range. Tog bort "Region" som filterparameter helt (bedömdes vara ett fel i ticketen — hör hemma i profilinställningar), enhetliggjorde "Clear"-knapparnas text till "Clear all filters", och konverterade Platforms-filtret på desktop från kryssrutor till samma chip-format som mobil, med alla fem plattformarna representerade på båda breddpunkterna. Stängde #14 med en engelskspråkig kommentar på GitHub som dokumenterar de medvetna avvikelserna. Påbörjade därefter ticket #15 (filmdetaljsida) och byggde hela sidan sektion för sektion, parallellt för desktop och mobil: hero (backdrop, poster, titel, år, genrer, speltid), en action-rad med Watchlist-/Watched-knappar och ett interaktivt RatingStars-betyg, en separat TMDB-betygsrad, overview, en hopfällbar TrailerEmbed (expanderad på desktop, hopfälld på mobil), en horisontellt skrollbar cast-sektion, en providers-sektion grupperad per land med highlight, och en horisontellt skrollbar rekommendationssektion. Byggde även en inloggad/oinloggad-variant och en loading-skeleton för hela sidan. |
| **Beslut**                | Implementerade pagineringskravet i #14 som oändlig scroll istället för numrerade sidkontroller, och tog bort "Region" som sökfilter helt — båda dokumenterade explicit som avvikelser i GitHub-kommentaren. I #15 landade RatingStars i att vara både visning av FoundIts eget aggregerade betyg och det interaktiva inputet för inloggade användare, med TMDB-betyget kvar som ett separat, alltid synligt referensvärde (relevant innan ett MediaItem fått tillräckligt med egna betyg). Action-knapparna byggdes som fullständiga pill-knappar med ikon och text, tydligare än MediaCards ikon-only-mönster. Provider-highlight kopplades till plattformar sparade i användarens profil, konsekvent med gårdagens beslut att flytta region/plattformsval dit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Problem och lösningar** | Absolut positionerade barn (overlay, watchlist-ikon) i en komponentinstans kan inte flyttas direkt via x/y i Figmas Plugin API — löstes genom att sätta constraints på huvudkomponenten, vilket propagerar automatiskt till alla instanser. Ett par färgvärden bundna till Figma-variabler renderades felaktigt mörka i specifika frames (trolig mode-diskrepans); löstes med literala hex-färger istället för variabelbindning på de drabbade elementen. Under granskningen hittades och rättades även: ett "16+"-filterchip felaktigt markerat som valt, en tappad guldfärgad rating-accent på mobilens MediaCard-instanser (skrevs över när textinnehållet sattes programmatiskt), och en oinloggad vy av filmdetaljsidan som av misstag visade den inloggade headern (avatar och nav) — orsakat av att en tidigare skriptkörning delvis rullades tillbaka efter ett senare fel i samma körning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Commits**               | Inga — rent design-/wireframe-arbete i Figma idag. Ticket #14 stängdes med en dokumenterande kommentar på GitHub.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Nästa steg**            | Fortsätta med #15 om fler content-states behövs, därefter resterande delar av vecka 3-backloggen och planeringen av vecka 4:s frontend-arbete. Postman-testsviten står fortfarande uppskjuten.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

### Onsdag 22/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vad jag gjorde**        | Fortsatte och slutförde seriedetaljsidan (#16): rättade en regression där fyra chevroner på mobil/oinloggad hade återgått till fel rotation, och lade till en Auth/Unauth-demonstration av "var kan man se"-logiken på desktop, byggd på de delade Providers-referenserna från filmdetaljsidan. Gjorde därefter en fullständig genomgång av hela filen och rättade: ett innehålls-klippningsfel där kort/scrim-höjden inte matchade huvudinnehållet på seriedetaljsidans desktop-vyer (276px respektive 315px överflöde för inloggad/oinloggad), samma typ av fel i loading-skeletons för både serie- och filmdetaljsidan, samt en felaktig sektionsordning på mobil/oinloggad där trailer visades före säsonger. På persondetaljsidan (#17) sorterades "Filmography as Actor" kronologiskt efter releasedatum (ett tidigare missat ticket-krav), sektionerna döptes om till "Filmography as Actor" / "Filmography — other roles", och en notis lades till om att ordningslogiken styrs av personens "Known for"-roll och inte är hårdkodad till skådespelare. Lade till en regissörs-/skaparrad i hjälterna på både film- och seriedetaljsidan samt en ny hopfällbar Crew-sektion under Cast (desktop och mobil, inloggad och oinloggad), med delade "Cast & Crew expanded"-referensvyer. Genomförde en formell efterlevnadsgranskning av #15, #16 och #17 mot den bokstavliga ticket-texten från GitHub — inga kvarvarande luckor hittades. <br><br> Byggde wireframes för watchlist och historik (#18): filterflikar, sorteringskontroll, MediaCard-grid med provider-highlight, ny-säsong-badge och spara/ta bort-ikon, samt empty- och loading-states för desktop och mobil. Historiksidan byggdes om från en radbaserad komponent till samma MediaCard-grid som watchlist efter jämförelse av tre layoutalternativ. En avslutande granskning mot ticket-texten visade att historiken inte längre redovisade en fullständig lista över sedda säsonger för serier; en expanderbar panel testades men ersattes med en enklare statisk räknare ("X av Y säsonger sedda"), eftersom säsongshantering ska ligga kvar enbart på MediaItem-sidan. <br><br> Byggde profilsidan (#19): användarinfo, länderkonfiguration med flagg-chips, streamingtjänster per land med flikar och på/av-reglage, en enkelvals-landsväljare för åldersgränser, samt en "Danger Zone" med kontoborttagning och bekräftelsedialog — tre tillstånd (inga länder, land utan tjänster, fullständigt konfigurerad) för desktop och mobil. Byggde inloggnings- och registreringssidorna (#20): e-post/lösenord med inline-valideringsfeedback, Google OAuth-knapp, omdirigeringsbanner för skyddade rutter, samt namn/e-post/lösenord/bekräfta lösenord med styrkeindikator för lösenord — fem tillstånd vardera (standard, valideringsfel, laddning, OAuth-laddning, lyckad omdirigering). Applicerade slutligen enhetliga stiländringar (helt rundade hörn på piller/knappar/inputfält, borttagna kantlinjer på Danger Zone, centrerad identitetssektion) och lade till en referensvy för hur ett manuellt skapat konto kan redigera namn/e-post/lösenord — ett krav som inte fanns uttryckt i #19. Avslutade med en fullständig efterlevnadskontroll av #19 och #20 mot den bokstavliga ticket-texten. |
| **Beslut**                | Season-hantering (markera/avmarkera som sedd) ska endast finnas på MediaItem-sidan för serier — historiken visar bara en statisk sammanfattning, för att undvika två källor till samma tillstånd. Age Rating-väljaren i #19 tolkades som ett enkelval trots ticketens motstridiga formulering ("Multi-select... only one possible selection"). Konsekvent helt rundade hörn (border-radius 999) infördes på alla piller, knappar och inputfält genom filen. Dokumenterade en lucka i #19 — manuellt skapade konton måste kunna redigera sin info, till skillnad från Google-synkade konton — via en separat referensvy istället för att bygga om huvudflödet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Problem och lösningar** | Innehålls-klippning återfanns i flera "riktiga" vyer på seriedetaljsidan efter tidigare säsongslist-utbyggnad — orsaken var att bara huvudinnehållets egen höjd hade verifierats, inte hela kort/scrim-kedjan; löstes genom att återinföra regeln att kortets höjd alltid ska motsvara huvudinnehållets position plus höjd. Nya Figma-buggar dök upp under dagens arbete: `layoutSizingHorizontal: FILL` kunde inte sättas innan en nod lagts till i sin auto-layout-förälder (löstes genom att alltid sätta FILL efter `appendChild`), och flera nya ramar fastnade på standardhöjden 100px tills `counterAxisSizingMode` uttryckligen sattes till AUTO — samma mönster som setts tidigare i projektet, nu även på knappar, en lösenords-styrkeindikator och en expanderbar panel i historiken.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Commits**               | Inga — rent design-/wireframe-arbete i Figma idag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Nästa steg**            | Fortsätta med resterande delar av vecka 3-backloggen samt påbörja planeringen av vecka 4:s frontend-implementation baserat på de nu färdiga wireframes för #14–#20. Postman-testsviten står fortfarande uppskjuten.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

### Torsdag 23/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vad jag gjorde**        | Avslutade ticket #122 (Add ageRatingCountry to Profile API): lade till en nullbar `ageRatingCountry`-kolumn i User-modellen i Prisma-schemat (migration `20260723131910_add_age_rating_country_to_user`), oberoende av den befintliga länder-multiselect. Uppdaterade `ProfileResponse`-typen i `packages/types`, service- och controller-lagren (återanvände befintlig `assertValidCountryCode` för validering mot landskatalogen), och skrev 9 nya Vitest-integrationstester som täcker GET/PUT /profile. Upptäckte under testkörningen att hela testsviten (37 tester i alla filer, inte bara de nya) misslyckades med Prisma-fel P2022, eftersom migrationen bara hade applicerats mot dev-databasen och inte mot testdatabasen. Automatiserade detta genom att lägga till `dotenv-cli` och ett `db:test:migrate`-skript som körs automatiskt före varje testkörning. Löste därefter ett P3005-fel (testdatabasen saknade migrationshistorik) genom en engångs-`migrate reset`, samt ett felstavat fältnamn (`ageRatingCoountry`) i service-lagret som orsakade att fältet saknades helt i API-svaret. Samtliga 44 tester passerar nu. <br><br> Påbörjade och slutförde #60 (Tailwind bas-layouts, default + auth). Under arbetet framkom att ticket-texten var föråldrad på två punkter jämfört med de Figma-wireframes som tagits fram tidigare i veckan: dark mode-stödet hade skrotats som designbeslut, och ticketens fyra namngivna CSS-variabler räckte inte för att täcka den fullständiga färgpaletten (tio tokens) som redan definierats i Figma. Byggde `app.css` med samtliga CSS-variabler, en `tailwind.config.ts` som mappar dem till Tailwind-teman, samt `default.vue`- och `auth.vue`-layouterna med minimala AppNav/AppFooter-stubbar (fullt innehåll läggs i en separat ticket). Rättade två fel som upptäcktes under verifieringen: `app.vue` saknade `<NuxtLayout>`-omslutningen helt (layouts hade aldrig kunnat tillämpas), och ett felstavat mappnamn (`layout/` istället för `layouts/`) gjorde att Nuxt inte hittade layout-filerna. Lade även till `tailwindcss` som explicit dev-dependency eftersom den bara fanns transitivt via `@nuxtjs/tailwindcss`, vilket bröt TypeScripts typupplösning i `tailwind.config.ts`. Verifierade båda layouterna manuellt (default med sticky nav/footer/container, auth med centrerat kort) på både mobil och desktop. |
| **Beslut**                | Dark mode-kravet i #60 markerades som föråldrat och utgått, efter tidigare Figma-beslut att inte implementera ljust/mörkt tema. Den fullständiga tio-tokens färgpaletten från Figma användes istället för ticketens minimala fyra CSS-variabler, med accent-gold som primär brand-färg. AppNav och AppFooter implementerades som minimala stubbar (endast logga) i väntan på en dedikerad ticket för fullt innehåll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Problem och lösningar** | Testdatabasens migrationer var inte synkade med dev-databasen, vilket fick hela testsviten att falla — löstes genom ett automatiserat `db:test:migrate`-skript (dotenv-cli + `prisma migrate deploy`) som körs före varje testkörning, samt en engångs `migrate reset` för att baseline:a testdatabasen. Ett felstavat fältnamn (`ageRatingCoountry`) i service-lagret dolde `ageRatingCountry` helt ur API-svaret utan att fångas av TypeScript. På frontend-sidan orsakade en saknad `<NuxtLayout>`-omslutning och ett felstavat mappnamn (`layout/` vs `layouts/`) att layouterna aldrig tillämpades trots korrekt kod i övrigt. Ett känt Vite/Firefox dev-mode-fel (CSS laddat som dynamisk modul blockeras pga MIME-typ) upptäcktes i slutet av dagen och skjuts upp för vidare felsökning — bekräftat opåverkat i Chrome.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Commits**               | `feat(api): add ageRatingCountry to Profile API` (#122) <br> `feat(web): add default and auth base layouts with Tailwind` (#60)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Nästa steg**            | Felsöka Vite/Firefox CSS MIME-typ-problemet i dev-läge (ej blockerande, men bör lösas eller dokumenteras som känt problem). Fortsätta med nästa ticket i vecka 4:s frontend-implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

### Fredag 24/7

|                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vad jag gjorde**        | Avslutade ticket #61 (AppNav/AppFooter): korrigerade glaseffekt-styling mot Figma, byggde AvatarMenu och LanguageMenu, fixade trånga mellanrum i Header (auth) samt navbar-overflow på mobil (dolde logotyp-text på mobil för att spara horisontellt utrymme). Löste ett gyllene halo-fel för aktiv rutt som bara fungerade i engelsk lokalisering: highlighten byggde på `route.path`, vilket bröt i es/sv eftersom i18n-strategin `prefix_except_default` lägger till ett lokal-prefix på alla icke-default-språk — bytte till `route.name`-baserad matchning, oberoende av lokal. <br><br> Byggde ticket #62 (Global Search Page) i sin helhet: SearchBar-komponent inbäddad i `index.vue` med 400ms debounce, minimum 3 tecken innan sökning triggas, samt exakt Figma-matchad 3-state styling (Default/Hover-Pressed/Active, Desktop och Mobil) hämtad från SearchPill-komponentsetet i Figma. Korrigerade en tidig arkitekturmiss: SearchBar gör en direkt query mot `/api/v1/search`, den navigerar inte och den renderar inte heller resultaten själv — det är sökresultat-sektionens ansvar i `index.vue`. Bekräftade via Figma att "Home — Search mode" är ett state av samma Home-frame, inte en separat sida, vilket avgjorde att ingen dedikerad `/search`-rutt byggdes — allt sök-state lever i `index.vue` via query-parametrar (`q`, `type`, medvetet utan `page` eftersom infinite-scroll-sidnumret inte ska kunna bokmärkas/replays). Byggde `searchStore` (Pinia) + `useSearch`-composable med en enda fetch-väg (`loadFromQuery`) delad mellan SSR-initial-load och alla klient-triggade ändringar, för att undvika dubbel-fetching. Implementerade infinite scroll med en enda sentinel-`<div>` + native `IntersectionObserver` (`rootMargin: 400px` för att prefetcha innan botten nås), utan nytt beroende. Verifierade SSR manuellt via curl: sökresultat finns i den initiala HTML:en vid `/?q=...`, Search Results-sektionen saknas helt utan query. <br><br> Byggde ticket #72 (MediaCard) som en återanvändbar kort-komponent för movie/series/person-resultat. Löste en namngivningskonflikt i ticket-texten (`people` vs `person`) genom att slå fast API:ets riktiga Zod-schema som källa till sanning (`person`, singular). Löste en layout-fråga kring grid- vs list-vy genom att göra kortet responsivt (`aspect-ratio + w-full`) istället för en variant-prop, eftersom Figma återanvänder samma kort i flera bredder (huvudgrid 255px/160px, horisontell-scroll-rader 160px/130px). Lade till en valfri `provider`-prop (ej i ticketens ursprungliga Props-lista) efter klargörande: "subscribed"-highlighten ska visa plattformsnamnet i grönt (success) när den är aktiv. Ändrade klick-beteendet från riktig navigering (`/movies/:id` etc.) till att öppna en modal, per uttryckligt beslut — byggde en `mediaModal`-store (Pinia) med öppna/tillbaka/stäng-historik samt ett minimalt `MediaDetailsModal`-skal (full innehållsdesign mot Figma-nod 77:221 är en separat framtida ticket). Kopplade in Search Results-sektionen i `index.vue` med header och 4 typ-filter-pills (All/Movies/Series/People), synliga endast för inloggade användare — ersatte en tidigare kugghjuls-ikon i Figma som saknade matchande panel, och byggde en `SearchTypeFilter`-Figma-komponent samt fixade en bredd-överlappning i 7 `SectionHeadingRow`s (FILL på desktop, vertikal stapling på 3 mobil-varianter). <br><br> Utförde en full kodgranskning av hela `/web` på begäran och hittade och tog bort dödkod i `SearchBar.vue` (kvarlämnade type-filter-variabler efter att pillsen flyttades till `index.vue`). <br><br> Uppgraderade Nuxt i monorepot till senaste versionen (4.4.8 → 4.5.0, vue-router 5.1.0 → 5.2.0), vilket orsakade en `nuxt typecheck`-regression ("Property '$t' does not exist", 20 identiska fel). Felsökningen gick igenom två felaktiga hypoteser (vue-router-dubblering, sedan TypeScript 7-läckage — båda motbevisade via `pnpm why typescript`) innan grundorsaken hittades: en duplicerad fysisk `vue`-instans (3.5.39 vs 3.5.40) kvarlämnad efter uppgraderingen, som fick TypeScript att behandla `@nuxtjs/i18n`:s typ-augmentering för `$t`som icke-sammanslagbar. Löstes med`pnpm dedupe`kört från monorepots rot (körning enbart inifrån`apps/web`var otillräcklig). Verifierat med en ren`rm -rf .nuxt && pnpm nuxt prepare && pnpm typecheck` — passerar rent. |
| **Beslut**                | Ingen dedikerad `/search`-rutt byggs — allt sök-state lever på `/` via query-parametrar, baserat på att Figma inte definierar sökläget som en separat sida. `MediaCard` byggs responsiv istället för med en grid/list-variant-prop, eftersom Figma återanvänder samma komponent vid flera bredder. Klick på `MediaCard` öppnar en modal istället för att navigera till en detaljsida — endast modalens mekanik (öppna/tillbaka/stäng) byggs nu, fullt innehåll är en separat framtida ticket. Ingen sorteringsfunktion byggs för sökresultat, eftersom varken vårt `/api/v1/search`-endpoint eller TMDB:s sök-API stödjer sortering.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Problem och lösningar** | Halo-highlighten för aktiv rutt fungerade bara i engelsk lokalisering eftersom den byggde på `route.path` istället för `route.name` — i18n-strategin lägger till lokal-prefix på alla icke-default-språk. Ett namngivningsfel (`people` vs `person`) i `MediaCard`s typ hade orsakat 400-fel från API:et om det inte fångats mot det riktiga Zod-schemat. En bredd-överlappning uppstod i `SectionHeadingRow` när kugghjuls-ikonen ersattes med bredare filter-pills — löstes med `FILL`-sizing på desktop och vertikal stapling på mobil. Dödkod i `SearchBar.vue` hittades vid en fullständig `/web`-granskning. Nuxt-uppgraderingen orsakade en typecheck-regression vars grundorsak (duplicerad `vue`-instans) krävde tre felsökningsomgångar innan `pnpm dedupe` från monorepots rot löste den definitivt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Commits**               | `fix(web): finalize AppNav/AppFooter styling and locale-independent active route` (#61) <br> `feat(web): implement global search with inline results on Home` (#62) <br> `feat(web): add MediaCard component and MediaDetails modal shell` (#72) <br> `chore(web): upgrade Nuxt to 4.5.0 and vue-router to 5.2.0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Nästa steg**            | Bygga fullt innehåll för `MediaDetailsModal` (hero, cast, crew, rekommendationer) mot Figma-nod 77:221 i en separat ticket. Ta bort det nu döda `scrollY`-fältet i `searchStore`. Fortsätta felsöka Vite/Firefox CSS MIME-typ-problemet från #60 (fortfarande uppskjutet). Fortsätta med nästa ticket i vecka 4:s frontend-implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

---

## Vecka 5 (27–30 juli 2026)

### Måndag 27/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

---

## Vecka 6 (3–6 augusti 2026)

### Måndag 3/8

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

---

## Vecka 7 (10–13 augusti 2026)

### Måndag 10/8

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

---

## Vecka 8 (17–20 augusti 2026)

### Måndag 17/8

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

```

```
