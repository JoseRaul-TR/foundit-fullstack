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

## Vecka 2 (6–9 juli 2026)

### Måndag 6/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

### Tisdag 7/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

### Onsdag 8/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

---

## Vecka 3 (13–16 juli 2026)

### Måndag 13/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

### Tisdag 14/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

---

## Vecka 4 (20–23 juli 2026)

### Måndag 20/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

### Tisdag 21/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

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
