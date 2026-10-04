# CLAUDE.md - AI Agent Context

## Project Overview

**Padel Americano Manager** - A React/TypeScript web app for managing Padel Americano tournaments. Americano is a social format where players rotate partners each round, ensuring everyone plays with and against different people.

## Workflow

**Local only: never push, never open GitHub PRs.** Integration branch = local `dev`; the owner merges `dev` → `main` gradually.
1. Work in a local feature branch (`feat/...`, `fix/...`, `chore/...`) from `dev` — or directly on `dev` when the owner asks
2. Verify: `npm run typecheck`, `npm run build`, real browser (desktop + 390 px mobile)
3. Keep a numbered table of pending branches; merge into `dev` only the ones the owner names (cherry-pick their own commits if stacked)
4. Delete local branches once merged; the owner deletes remote ones

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS 3.4 compiled at build (PostCSS: `tailwind.config.js`, `postcss.config.js`, `index.css`); Inter self-hosted (`@fontsource-variable/inter`). Never build class names from pieces (purge would drop them)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Deployment**: Docker image `jotacor/padelamericano` (self-hosted: TrueNAS/Portainer), domain through Cloudflare DNS proxy
- **Backend**: `server/` — plain Node (built-ins only, runs TypeScript directly: `node server/index.ts`)
- **Storage**: files in `DATA_DIR` (`/data` in Docker): one JSON per shared tournament in `shares/`, expiring 24 h after the last update

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main React component - UI, state management, scoring, both modes |
| `types.ts` | TypeScript interfaces (Player, Match, Round, Tournament, LeaderboardEntry) |
| `utils/scheduler.ts` | **Core logic** - tournament schedules, skill-balanced event rounds, championship |
| `LeaderboardDisplay.tsx` | Standalone auto-refreshing leaderboard display |
| `GameViewer.tsx` | Read-only tournament viewer (polling) |
| `index.tsx` | React entry point + routing |
| `index.html` | HTML shell, OG meta tags (Spanish) |
| `index.css` | Tailwind directives + global styles (`animate-in`, `no-scrollbar`) |
| `server/index.ts` | Server entry (env `PORT` 8788, `DATA_DIR`, `DIST_DIR`), hourly sweep of expired shares |
| `server/app.ts` | `/api/game` POST, `/api/game/:id` GET/PUT/DELETE (body ≤ 512 KB → 413, malformed → 400), `/api/health`; static `dist/` with SPA fallback, immutable cache for `/assets/*`, absolute `og:image` |
| `server/store.ts` | File store: `shares/<id>.json`, atomic writes, ids validated (no path traversal), expiry |
| `server/secret.ts` | Share write token: 128-bit random, stored as `sha256:<hex>`; legacy 4-digit PIN hashes still accepted |
| `hooks/useShareSync.ts` | Organizer sharing: create/delete, one PUT in flight, debounce 1.2 s, retries 2/5/15/30 s (+ on online/visible), 404 → expired alert, 401/403 → revoked; share bound to `tournamentId` |
| `utils/shareText.ts` | Texts to copy: `roundText` ("Pista 1: ANA-LUIS vs MARTA-JUAN (7-4)", resting) and `standingsText` (+ live link) → "Copiar ronda" / "Copiar clasificación" (clipboard + toast) |
| `utils/browser.ts` | `copyText` (clipboard with `execCommand` fallback) and `newId` (UUID without `crypto.randomUUID`): app must work on plain http (LAN IP), where those APIs don't exist — never call `navigator.clipboard`/`crypto.randomUUID` directly |
| `hooks/useAutoScroll.ts` | TV display (`/display/:id`): long lists scroll by themselves (pause 4 s, down 40 px/s, pause, back up; user input pauses 15 s) |
| `hooks/usePolling.ts` | Viewer/display polling, paused while the tab is hidden |
| `components/ShareModal.tsx` | Share links + sync status (retry button) |
| `server/words.ts` | Spanish word list + `randomWordId()` for memorable share IDs |
| `utils/ranking.ts` | League matchmaking by standings: strengths, ranked rotating round, repeat cost |
| `utils/fixedPairs.ts` | Fixed pairs: round robin (Random), per-round matching (League), finals |
| `utils/playoff.ts` | Playoff (every mode, Tabla tab): top 8 players → teams 1+8 vs 4+5, 2+7 vs 3+6 (fixed pairs: top 4, 1 vs 4, 2 vs 3) → final; no 3rd place, everyone else rests; League seeds only active players. While a playoff runs, no normal rounds can be added |
| `utils/classicSchedule.ts` | Random mode entry points: `buildClassicSchedule` (start) and `nextClassicRound` ("+" rounds), used by App |
| `utils/leaderboard.ts` | `computeLeaderboard()` shared by all views; per-pair entries in fixed mode |
| `utils/playerNames.ts` | Name cleanup + duplicate check (frontend) |
| `utils/tournamentFile.ts` | YAML export/import (pure): `serializeTournament`, `parseTournamentFile`, `bumpExportMeta`, `exportFilename`. Lazy-loaded by App (only module that imports `yaml`) |
| `utils/tournamentSchema.ts` | `validateTournament(v, meta?)`: shape validation shared by YAML import and (later) the server; new `Tournament` fields must be added here (unknown keys are dropped) |
| `utils/tournamentSummary.ts` | `summarizeTournament` (progress + leader), no `yaml` import |
| `README.es.md` | Spanish translation of `README.md`. **Keep in sync**: any README.md change must be mirrored in README.es.md in the same PR (same structure/sections; code, commands, paths untranslated) |
| `i18n/translations.ts` | UI strings per language (`en` = source of truth, `es`) |
| `i18n/I18nContext.tsx` | `I18nProvider`, `useI18n()` hook (`t`, `lang`, `locale`, `courtLabel`), `LanguageLink` (discreet link to the other language: setup panel footer + viewer footer) |

## Architecture

### Two Tournament Modes

Internal `mode` values are kept for stored-data compatibility: `'classic'` = **Random / Aleatorio**, `'event'` = **League / Liga**.

**Random / Aleatorio** (`mode: 'classic'`, default):
- All rounds pre-generated using Whist tournament logic
- Player roster locked after tournament starts
- Courts chosen in setup (`classicCourts` state, null = players ÷ 4, saved as `tournament.numCourts`); fewer courts → `packRounds()` spreads the full schedule over more rounds (same matches, fewest-played first) — extra rounds and finals use `tournament.numCourts` too
- **Nobody rests two rounds in a row** (all modes, whenever resting ≤ playing): every round generator orders players with `playOrder()` (rested last round first, then fewest played). Random: `packRounds` searches for full courts + last round's resters, `avoidBackToBackRests` reorders the rounds (same matches, courts re-rotated), and `regenerateFromBackToBackRest` generates any remaining tail like "+" rounds. Checked for 5–30 players × every court count in `utils/rests.test.ts`
- Perfect schedules for 8, 12, 16 players
- "Prioritize initial skill" toggle (rotating only, `tournament.prioritizeSkill`): `generateSkillBalancedSchedule` builds every round with the League algorithm instead of Whist → much more even matches (8p: avg diff 1.36 → ~0.65) but some partnerships repeat/never happen; extra rounds also use `generateEventRound`
- `skillLevel` optional: `generateAmericanoSchedule` builds the Whist/Berger schedule on abstract slots, then `assignSlotsBySkill` picks the player→slot mapping minimizing Σ(match skill diff)². Partner/opponent guarantees are kept. For perfect Whist (8/12/16) every mapping gives the same total (each pair partners 1×, opposes 2×), so skill only helps other sizes

**League / Liga** (`mode: 'event'`):
- Rounds generated one-at-a-time with skill-balanced matchmaking
- Manager adds players and toggles them active/inactive between rounds (no self-service check-in)
- `skillLevel` (low/medium/high) drives team balancing
- Matchmaking options (combinable, stored on tournament, read via `leagueMatchmaking()`): "Prioritize initial skill" (`prioritizeSkill`, **undefined = true** for legacy Leagues) and "Prioritize standings" (`prioritizeRanking`). `utils/ranking.ts`: `playerStrengths()` (percentile of points won/played → 1..3, blended with prior skill by matches played), `generateRankedRound()` (rotating: similar-strength groups of 4 + even split, local search), `repeatCost()` (excess-over-least-met², recency) also used by `generateFixedPairsRound(..., { strength, ranked })`. Neither option → `generateEventRound` with constant strength (rotation only). Weights in `MATCH_WEIGHTS` were tuned by simulation (12–24 players); too high `level`/`balance` freezes groups
- `isActive` toggle for round-by-round player pool management
- Courts (`tournament.numCourts`, default 4, max `MAX_COURTS`) changeable between rounds from the setup panel
- Purple accent theme (`bg-purple-600`, `bg-purple-950`)

**Pair modality** (both modes): `tournament.pairMode` = `'rotating'` (default, Americano) or `'fixed'` (manager pairs players in setup; `tournament.pairs: [id, id][]`).
- Random + fixed: full round robin between pairs (`generateFixedPairsSchedule`)
- League + fixed: `generateFixedPairsRound` — fewest-played pairs first, minimize repeat opponents + skill gap; a pair plays only if both are active (toggling one toggles both); new pairs can be formed mid-league
- Leaderboard entries per pair (`playerId = pairKey`); finals = 1st vs 2nd pair

### Scheduling Logic (`utils/scheduler.ts`)

**Key Functions**:
- `generateAmericanoSchedule()` - Creates all rounds for classic mode
- `generateEventRound()` - Skill-balanced single round from active pool
- `generateAdditionalRound()` - Adds fair rounds on-demand
- `generateChampionshipRound()` - Creates finals: 1st+3rd vs 2nd+4th

**Skill Matching** (`generateEventRound`):
- low=1, medium=2, high=3
- Groups of 4 selected to balance total skill per match
- Team splits evaluated for skill equality + partnership/opponent history
- Avoids repeat partnerships and opponents

**Court Rotation**: `optimizeCourtAssignments()` ensures court variety: minimizes players staying on their last court, ties broken by round number (lexicographic index `round % ties`). Exact DP over court subsets (n·2ⁿ), identical to the old n! search (equivalence test in `utils/optimizer.test.ts`).

**Random general case** (Berger sizes): per round, branch-and-bound over pair groupings with a greedy starting bound + admissible lower bound (keeps the first optimal grouping → same output) and a deterministic node budget (400k, only hit from ~36 players).

### Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | App | Main tournament manager |
| `/game/:id` | GameViewer | Read-only viewer (polling) |
| `/display/:id` | LeaderboardDisplay | Live leaderboard display |

### State Management

All state lives in `App.tsx` using React hooks.

**localStorage keys**:
- `padel_players` - Player list
- `padel_tournament` - Full tournament state
- `padel_share_state` - Sharing state (id, pin, url)
- `padel_event_mode` - League mode flag
- `padel_event_courts` - Event court count
- `padel_classic_courts` - Random mode court count (absent = players ÷ 4)
- `padel_pair_mode`, `padel_pairs`, `padel_prioritize_skill` - Pair modality, fixed pairs and skill-priority toggle during setup
- `padel_league_prioritize_skill`, `padel_prioritize_ranking` - League matchmaking toggles during setup
- `padel_tournament_name` - name for the next tournament (setup field "Nombre del torneo"; empty = automatic "Liga - YYYY-MM-DD" / "Americano - YYYY-MM-DD"); the open tournament's name is edited in place
- `padel_points_per_match` - points per match chosen in setup ('free' or a number; absent = 11)
- `padel_language` - UI language (`en`/`es`), saved on explicit choice or `?lang=xx` in the URL; default = Spanish (browser language ignored)

### Cloud Sharing

- Organizer creates shared tournament → POST `/api/game`
- Share IDs: two different Spanish words from `server/words.ts` (`bala-zapato`, ~320 words → ~100k combos); POST retries 5× if the id exists, then appends a number (`bala-zapato-7`). IDs are opaque strings everywhere (old 6-char IDs still work) — keep words `^[a-z]{3,7}$`, no ñ/accents, no duplicates
- Share modal shows viewer link (`/game/:id`) and leaderboard display link (`/display/:id`, TV/screen) in both modes
- Auto-syncs on every change → PUT `/api/game/:id` (`useShareSync`: debounced, one request at a time, retries, visible status); organizer is the only writer
- Viewers poll → GET `/api/game/:id` every 5s while visible (`usePolling`); a failed poll keeps the last data; the viewer follows the live round (`liveRoundIndex`) until navigated by hand
- TTL: 24 h after the last update (each PUT renews it)
- Write auth: header `X-Tournament-Pin` carries a random token (field still named `pin` for compatibility)

### Export / Import (YAML)

- Setup right panel: "Export" (YAML file; when a tournament exists) + "Import" (always). No DB; files only
- File name: `padel-{liga|aleatorio}-{name}-{YYYY-MM-DD}-v{revision}.yaml` (`exportFilename`; mode word translated, automatic names left out, a leading mode word in the name not repeated; date = `createdAt`, `utils/dates.ts` `ymd`)
- File: header comments, `format: padel-americano/v1`, `revision`, `exportedAt`, `history[]` (revision, exportedAt, rounds/matches done, leader), `tournament` (full `Tournament` minus `exportMeta`)
- Versioning: `tournament.exportMeta = { revision, history }`; each export bumps revision + appends history (kept in state, so import v2 → export = v3)
- Import validates shape (players, rounds, matches, pair/player ids); invalid → translated alert, state untouched. Confirms before replacing, stops sharing, restores setup state (players, courts, mode, pairs), opens Scores
- Changing the file format: bump `TOURNAMENT_FILE_FORMAT` and keep parsing older versions. Adding optional fields (e.g. `createdAt/updatedAt/finishedAt`) keeps v1: older versions just drop them
- `utils/` modules use `import type` for types (lets Node run them with type stripping, e.g. scripts)

### Scoring & Leaderboard

Order: Match Wins → Total Points → Point Differential (fixed, no user choice; `computeLeaderboard` → all views, finals, "Copiar clasificación"). Every standings view (app, viewer, TV, "Copiar clasificación") shows DIF (`formatDiff`: +5/-3) so ties on wins and points are readable; no skill level in standings. Scores table also shows Pts/Match (informative only). TV shows champions/runners-up (`finalResult`) once the final is played

### Score entry

- `tournament.pointsPerMatch` (11 default / 15 / 21 / Libre — odd so no ties; `padel_points_per_match` stores 'free' explicitly; older values like 24 stay selectable, setup panel, editable any time; `padel_points_per_match` for setup): `utils/scoring.ts` `applyScoreInput` fills the other side with P − x unless the organizer typed that side by hand (`lastTypedSide` per match), so time-capped results (15-7) still work; `isInvalidScore` (half-entered, or sum ≠ P; blank is fine) shows "Suman X de P"/"Falta un resultado" and **blocks** moving to the next round (arrow/keys: current round) and creating rounds ("+", Generar ronda, finals, playoff: any round) via `scoresOk` → toast + jump to the match
- Setup: points per match is a − / + stepper over 11 → 15 → 21 → Libre (`pointsSteps`, shares `renderStepperControl` with courts)
- Score inputs: `type=text inputMode=numeric`, select on focus, Enter → next empty score (`data-score`)
- "Undo round" (`canUndoRound`): last round with no score at all; League always, Random only finals or extra "+" rounds (previous round complete) — never the pre-generated schedule

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Vite :3000 (HMR) + API server :8788 (node --watch server/index.ts, data in ./data), /api proxied; Ctrl-C stops both
npm start      # Production server (dist/ + /api)
npm run dev:vite # Vite only, no /api
npm test       # vitest (scheduler invariants, golden schedules, YAML, leaderboard…)
npm run build  # Production build
npm run preview # Preview production build
```

Local dev: `scripts/dev.mjs` spawns both; shared tournaments in `./data` (gitignored).

**Docker** (`Dockerfile`): build stage `npm ci && npm run build`; runtime `node:24-alpine` with only `dist/`, `server/` and `types.ts` (no node_modules), `CMD node server/index.ts`, volume `/data`, healthcheck `/api/health`. Server code must stay erasable TypeScript (no enums/parameter properties, `import type`, `.ts` extensions) and use only Node built-ins. `docker-compose.yml` = build + volume `padel-data:/data` + optional `HOST_PORT` from `.env`. CI `.github/workflows/docker.yml`: only on push to `main` → build + push `jotacor/padelamericano:{latest,sha8}` (secret `DOCKER_PASSWORD`).

## Conventions

- Run `npm run typecheck` and `npm test` before committing (app + server, `strict` + `noUnused*`; must be error-free). CI (`.github/workflows/ci.yml`) runs typecheck + test + build on push to `main`
- Tests: vitest, `*.test.ts` next to the code (`utils/`, `i18n/`, `hooks/`, `server/`), helpers in `utils/testing.ts` (`makePlayers`, `seedRandom`, `expectValidRound`…). `utils/__snapshots__/scheduler.test.ts.snap` = golden Random schedules 4–30 players: scheduler/optimizer changes must keep it identical (only update with `npx vitest run -u` when a change is intended)
- Championship detection uses `match.id.includes('championship')` (`isFinal`): quick final round and playoff final (`r{n}-playoff-championship`). Playoff semifinals: `r{n}-playoff-sf{1|2}`; use `utils/playoff.ts` helpers (`isFinal`, `isPlayoffMatch`, `matchTitle`, `roundBadge`) instead of matching ids by hand
- League mode detected via `tournament.mode === 'event'`
- Player names are uppercase (`cleanName` uppercases; `upperNames`/`withUpperNames` normalize saved/imported data) and unique: use `isNameTaken()` (case/accent/whitespace-insensitive) on every add path
- Viewer/display views communicate only through the server API (no localStorage) — except the per-device `padel_language` UI preference
- **i18n**: never hardcode UI text; add key to `en` in `i18n/translations.ts` and same key to `es` (TS errors if missing), use `t('key', { param })`. Unknown keys are type errors. Use `locale` for `toLocale*String()`. Courts have no names: always "Pista N"/"Court N" via `courtLabel(index)`
- Share token stored in `padel_share_state` (with `tournamentId`), never displayed to users
- Hardcoded schedules in `SCHEDULE_8` and `SCHEDULE_16` are verified optimal

## Hosting

- No Cloudflare Pages/Workers/KV: the container is the whole app; Cloudflare is only DNS/proxy for `padel.jotacor.com`
- No AI features: the AI nickname generator was removed (players have only a name)
