# CLAUDE.md - AI Agent Context

## Project Overview

**Padel Americano Manager** - A React/TypeScript web app for managing Padel Americano tournaments. Americano is a social format where players rotate partners each round, ensuring everyone plays with and against different people.

**Live at**: https://padelme.io

## Workflow

**ALWAYS use feature branches and PRs.** Never push directly to `main`. Every change — no matter how small — goes through:
1. Create a feature branch (`feature/...`, `fix/...`)
2. Commit and push to the branch
3. Open a PR via `gh pr create`
4. Test on the Cloudflare Pages preview deployment
5. Merge only after preview is verified

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS (via CDN in index.html)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Deployment**: Cloudflare Pages
- **Backend**: Cloudflare Pages Functions (serverless)
- **Storage**: Cloudflare Workers KV (24hr TTL, shared tournaments)
- **AI**: Anthropic Claude Haiku (nickname generation via `/api/nicknames`)

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main React component - UI, state management, scoring, both modes |
| `types.ts` | TypeScript interfaces (Player, Match, Round, Tournament, LeaderboardEntry) |
| `utils/scheduler.ts` | **Core logic** - tournament schedules, skill-balanced event rounds, championship |
| `LeaderboardDisplay.tsx` | Standalone auto-refreshing leaderboard display |
| `GameViewer.tsx` | Read-only tournament viewer (polling) |
| `index.tsx` | React entry point + routing |
| `index.html` | HTML shell with Tailwind CDN, OG meta tags |
| `functions/api/game.ts` | POST - create shared tournament |
| `functions/api/game/[id].ts` | GET/PUT/DELETE - shared tournament CRUD |
| `functions/api/nicknames.ts` | POST - AI nickname generation; GET - `{ enabled }` (key configured?) |
| `utils/nicknames.ts` | `useNicknamesAvailable()` hook — hides nickname UI when no API key |
| `functions/types.ts` | Shared API types, PIN hashing, ID generation |
| `functions/words.ts` | Spanish word list + `randomWordId()` for memorable share IDs |
| `utils/fixedPairs.ts` | Fixed pairs: round robin (Random), per-round matching (League), finals |
| `utils/leaderboard.ts` | `computeLeaderboard()` shared by all views; per-pair entries in fixed mode |
| `utils/playerNames.ts` | Name cleanup + duplicate check (shared by frontend and Functions) |
| `i18n/translations.ts` | UI strings per language (`en` = source of truth, `es`) |
| `i18n/I18nContext.tsx` | `I18nProvider`, `useI18n()` hook (`t`, `lang`, `locale`, `courtName`), `LanguageSwitcher` |

## Architecture

### Two Tournament Modes

Internal `mode` values are kept for stored-data compatibility: `'classic'` = **Random / Aleatorio**, `'event'` = **League / Liga**.

**Random / Aleatorio** (`mode: 'classic'`, default):
- All rounds pre-generated using Whist tournament logic
- Player roster locked after tournament starts
- Perfect schedules for 8, 12, 16 players
- "Prioritize skill" toggle (rotating only, `tournament.prioritizeSkill`): `generateSkillBalancedSchedule` builds every round with the League algorithm instead of Whist → much more even matches (8p: avg diff 1.36 → ~0.65) but some partnerships repeat/never happen; extra rounds also use `generateEventRound`
- `skillLevel` optional: `generateAmericanoSchedule` builds the Whist/Berger schedule on abstract slots, then `assignSlotsBySkill` picks the player→slot mapping minimizing Σ(match skill diff)². Partner/opponent guarantees are kept. For perfect Whist (8/12/16) every mapping gives the same total (each pair partners 1×, opposes 2×), so skill only helps other sizes

**League / Liga** (`mode: 'event'`):
- Rounds generated one-at-a-time with skill-balanced matchmaking
- Manager adds players and toggles them active/inactive between rounds (no self-service check-in)
- `skillLevel` (low/medium/high) drives team balancing
- `isActive` toggle for round-by-round player pool management
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

**Court Rotation**: `optimizeCourtAssignments()` ensures court variety.

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
- `padel_court_names` - Court names
- `padel_share_state` - Sharing state (id, pin, url)
- `padel_event_mode` - League mode flag
- `padel_event_courts` - Event court count
- `padel_pair_mode`, `padel_pairs`, `padel_prioritize_skill` - Pair modality, fixed pairs and skill-priority toggle during setup
- `padel_language` - UI language (`en`/`es`), saved only on explicit choice; default = browser language

### Cloud Sharing

- Organizer creates shared tournament → POST `/api/game`
- Share IDs: two different Spanish words from `functions/words.ts` (`bala-zapato`, ~320 words → ~100k combos); POST retries 5× if the KV key exists, then appends a number (`bala-zapato-7`). IDs are opaque strings everywhere (old 6-char IDs still work) — keep words `^[a-z]{3,7}$`, no ñ/accents, no duplicates
- Share modal shows viewer link (`/game/:id`) and leaderboard display link (`/display/:id`, TV/screen) in both modes
- Auto-syncs on every change → PUT `/api/game/:id` (debounced 500ms); organizer is the only writer
- Viewers poll → GET `/api/game/:id` every 5s
- 24-hour TTL auto-cleanup

### Scoring & Leaderboard

Tiebreaker order: Total Points → Match Wins → Point Differential

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Vite :3000 (HMR) + wrangler pages dev :8788 (Functions + local KV), /api proxied; Ctrl-C stops both
npm run dev:vite # Vite only, no /api
npm run build  # Production build
npm run preview # Preview production build
```

Local dev: `scripts/dev.mjs` spawns both; KV state in `.wrangler/state/`; `ANTHROPIC_API_KEY` via `.dev.vars` (gitignored).

**Docker** (`Dockerfile` + `docker-entrypoint.sh`): multi-stage build, runtime = `wrangler pages dev dist` on port 8788, KV persisted in `/data`, `ANTHROPIC_API_KEY` passed as binding. Wrangler version pinned from `package-lock.json`. If Functions import new root-level files/dirs, add them to the runtime `COPY` lines.

## Conventions

- Run `npm run typecheck` before committing (app + Functions; must be error-free)
- Championship detection uses `match.id.includes('championship')`
- League mode detected via `tournament.mode === 'event'`
- Player names must be unique: use `isNameTaken()` (case/accent/whitespace-insensitive) on every add path; API returns 409 on duplicates
- Viewer/display views communicate only through KV (no localStorage) — except the per-device `padel_language` UI preference
- **i18n**: never hardcode UI text; add key to `en` in `i18n/translations.ts` and same key to `es` (TS errors if missing), use `t('key', { param })`. Unknown keys are type errors. Use `locale` for `toLocale*String()`. Default court names ("Court N"/"Pista N") localized via `courtName()`; custom names kept
- AI nicknames follow UI language (`lang` sent to `/api/nicknames`)
- PIN stored internally for cloud sync but not displayed to users
- Hardcoded schedules in `SCHEDULE_8` and `SCHEDULE_16` are verified optimal

## Environment Variables (Cloudflare Pages)

- `ANTHROPIC_API_KEY` - For AI nickname generation (set in both Production and Preview). If unset, nickname options are hidden in the UI
- KV Namespace binding: `TOURNAMENTS`
