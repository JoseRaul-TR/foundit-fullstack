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

Fullständig entitetsdesign genomförs i dbdiagram.io (ticket #1, vecka 3).

**Sommarplan reviderad:**
Identifierade gap i ursprunglig plan och reviderade vecka 3–10:
- Lade till dedikerad session för datamodelldesign (vecka 3, torsdag)
- Flyttade Figma-wireframes till vecka 4 (före frontend-kodning, inte 
  samma dag)
- Lade till Tailwind CSS-setup i vecka 3
- Utökade Better Auth till 2 dagar (vecka 4)
- Lade till Zod för frontend-validering i vecka 6

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

| Beslut | Motivering |
|---|---|
| API-first (backend som enda källa) | Framtida React Native-app använder samma API |
| Endast TMDB v3 | Egen DB för användardata, inget TMDB-kontoberoende |
| Highlights i backend | Affärslogik på serversidan, klientagnostisk |
| Historik på säsongsnivå (ej episod) | Enkel modell, tillräcklig UX |
| En enda WatchedItem-tabell | Undviker duplicerad logik för film/TV |
| On-demand ny säsong-detektion | Ingen infrastrukturkomplexitet för MVP |
| Separata TMDB + personliga betyg | Måtten tjänar olika syften |

#### Nästa steg

- [ ] Tisdag 30/6: Setup av monorepo med pnpm workspaces (#9)
- [ ] Onsdag 1/7: Docker Compose + Tailwind CSS (#10, #11)
- [ ] Torsdag 3/7: Datamodelldesign + Prisma-schema (#1, #16)

#### Resurser

- [TMDB API v3 — dokumentation](https://developer.themoviedb.org/docs)
- [TMDB append_to_response](https://developer.themoviedb.org/docs/append-to-response)
- [Better Auth — Express-guide](https://www.better-auth.com/docs/integrations/express)
- [dbdiagram.io](https://dbdiagram.io)
- [pnpm workspaces](https://pnpm.io/workspaces)

---

### Tisdag 30/6

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

### Onsdag 1/7

- **Aktivitet**:
- **Beslut**:
- **Problem**:
- **Lösning**:
- **Reflektion**:
- **Resurser**:
- **Lärdom**:

---

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
