# 🎾 Padel Americano Manager

🌐 **English** · [Español](README.es.md)

A modern web app for running **Padel Americano** tournaments — the social format where players rotate partners each round so everyone plays with and against different people.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare)

## Features

### Core Tournament
- ✅ **Fixed Pairs** — Optional in both modes: pick partners yourself, only opponents rotate
- ✅ **Two Modes** — *Random* (all rounds pre-generated, Whist logic) and *League* (rounds one at a time, skill-balanced, players can join/sit out between rounds)
- ✅ **Standings-based Matchmaking** — League option: every round re-matches partners and rivals from the results so far, while everyone still plays everyone
- ✅ **Smart Scheduling** — Mathematically optimal "Whist" schedules for 8, 12, and 16 players
- ✅ **Court Rotation** — Algorithm ensures players rotate across different courts each round
- ✅ **Courts You Choose** — Use the courts the club gives you (− / +), in both modes, whatever the number of players; the rest sit out in turn
- ✅ **Live Scoring** — Enter scores per round, see leaderboard update in real-time
- ✅ **Points per match** — Matches to 11, 15 or 21 points (odd: no ties; 11 by default, or free): type one score and the other fills in (13 → 8); numeric keypad, Enter jumps to the next score; a warning if a result doesn't add up
- ✅ **Winner Highlighting** — Completed matches show winning team in green

### Flexible Tournament Management
- ✅ **Add Rounds On-Demand** — "+" button to extend tournament with fair player rotation
- ✅ **Championship Round** — Create finals: 1st+3rd vs 2nd+4th place
- ✅ **Championship Results** — Shows winning team, runner-up, and individual rankings
- ✅ **Locked Setup** — Players locked once tournament starts (prevents accidents)

### Sharing & Cloud Sync
- ✅ **Shareable Links** — Share with spectators via a memorable URL (`/game/bala-zapato`) plus a TV leaderboard display (`/display/bala-zapato`)
- ✅ **Real-time Sync** — Scores sync to cloud, viewers see updates automatically
- ✅ **Read-only Viewing** — Spectators can view rounds and scores without editing
- ✅ **Auto-cleanup** — Shared links expire 24 hours after the last change
- ✅ **Reliable sync** — Retries on bad signal and shows when the link is out of date; viewers open on the round being played

### User Experience
- ✅ **Mobile-First** — Responsive design works great on phones at the courts
- ✅ **Keyboard Navigation** — Arrow keys to navigate between rounds
- ✅ **Spanish first** — Spanish by default; English available from a discreet link in Setup and the viewer, or with `?lang=en` in any URL (e.g. the TV display)
- ✅ **No account needed** — Data stays on the device (localStorage)
- ✅ **Export / Import (YAML)** — Save a tournament to a human-readable `.yaml` file and load it later to see results or keep playing; each export bumps a `revision` and appends to a `history` log inside the file
- ✅ **Tie-Breaking** — Sorted by total points → match wins → point differential

## Quick Start

**Prerequisites:** Node.js 20.19+

```bash
# Install dependencies
npm install

# Start dev server (Vite + Pages Functions + local KV)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Sharing, display and viewer links all work locally.

## How It Works

### Tournament Flow

1. **Setup** — Add players with a skill level (4+ required; 8/12/16 for "perfect" Whist balance), pick a mode and pair modality
2. **Configure Courts** — Pick how many courts you have (Court 1, 2, 3…)
3. **Start** — *Random* creates all rounds up front; *League* generates them one at a time
4. **Play** — Navigate through rounds, enter scores after each match
5. **Extend** — Add more rounds with "+" button if time permits
6. **Finals** — Create championship round from leaderboard
7. **Results** — See team champions and individual rankings

### Tournament Modes

| | **Random** (default) | **Random + "Prioritize initial skill"** | **League** |
|---|---|---|---|
| **Rounds** | All generated at start (N−1, or N if odd; more with fewer courts) | All generated at start (same count) | One at a time ("Generate round N") |
| **Partners** | Whist / Berger rotation: everyone partners everyone once | Chosen each round to balance skill | Chosen each round to balance skill |
| **Skill level** | Only decides who takes which slot of the schedule. No effect with 8/12/16 (every assignment is equally balanced); helps other sizes | Main criterion: groups of 4 and team splits as even as possible | Initial skill and/or standings, see [League matchmaking](#league-matchmaking) |
| **Repeats** | None: no repeated partners, opponents spread evenly | Some partners repeat, others never meet (8 players: ~7 of 28 pairs) | Avoided where possible (penalized, not forbidden) |
| **Match balance** (8 players, mixed skills) | Avg skill gap per match ≈ 1.36 | ≈ 0.64 | Similar to "Prioritize initial skill" |
| **Roster** | Locked once started | Locked once started | Add players and toggle active/resting between rounds |
| **Who plays** | Fixed by the schedule (byes rotate) | Fewest matches played first | Fewest matches played first, active players only |
| **Courts** | You choose (default players ÷ 4). Fewer courts → the same schedule spread over more rounds (all partner/opponent guarantees kept), players rest in turn | Same as Random | You choose (default 4), changeable between rounds; extra players rest |
| **Extra rounds (+)** | Fair rotation avoiding repeats, skill-even opponents | Same algorithm as League | Next round button |
| **Finals** | 1st+3rd vs 2nd+4th | 1st+3rd vs 2nd+4th | — |
| **Best for** | Closed group with time for the full schedule | Mixed-level group where even matches matter more than meeting everyone | Open sessions where people arrive/leave, unknown number of rounds |

Skill levels count as Low = 1, Medium = 2, High = 3 (a team's skill is the sum of both players).

#### League matchmaking

Two options in League setup, combinable:

| | **Prioritize initial skill** (on by default) | **Prioritize standings** |
|---|---|---|
| **Based on** | Level set for each player (Low/Medium/High) | Results so far, re-evaluated before every round |
| **Groups of 4** | Mixed levels, teams as even as possible | Similar strength (top with top, Mexicano-style), teams as even as possible |
| **Repeats** | Repeated partners/opponents avoided where possible | Allowed against similar-level rivals, but the cost grows (squared) the further a rival is ahead of your least-played one, plus a penalty for the last two rounds → everyone still plays everyone |
| **Fixed pairs** | Rivals with a similar pair level | Rivals by standings: similar pairs meet more often |

- **Strength from standings** = percentile of points won per point played (not total points, so byes and late arrivals aren't penalized), on the same 1–3 scale as skill.
- **Both on**: the initial level counts at first and results take over as matches are played (results weigh n/(n+2) after n matches). **Standings only**: everyone starts equal. **Neither**: rotation only.
- Simulated (both options vs skill only, 12–30 players, 2–5 courts, 10 rounds): rotating pairs → 6–18% smaller skill gap per match when players get ≥8 matches (no difference with few matches each), fewer repeated partners, equal or better opponent coverage. Fixed pairs → ~5–15% smaller gap, opponent coverage within ~6 points of skill only.

**Fixed pairs** (optional in both modes, *Pairs: Fixed*): you pair players yourself and only opponents rotate.

| | **Random + Fixed pairs** | **League + Fixed pairs** |
|---|---|---|
| **Schedule** | Full round robin: every pair meets every other pair once | One round at a time: fewest-played pairs first, avoid repeat opponents, balance pair skill (or standings, see above) |
| **Requirements** | Every player must have a partner | Unpaired players wait; new pairs can be formed mid-league |
| **Resting** | One pair rests per round if the number of pairs is odd | A pair rests together (toggling one partner toggles both) |
| **Standings / Finals** | Per pair; finals 1st vs 2nd pair (3rd vs 4th on the next court) | Per pair |

### Scheduling Algorithm

*Random* mode (rotating pairs) uses **Whist Tournament** logic:

| Players | Rounds | Courts | Balance |
|---------|--------|--------|---------|
| 8 | 7 | 2 | Partner everyone once, oppose everyone twice |
| 12 | 11 | 3 | Partner everyone once, oppose everyone twice |
| 16 | 15 | 4 | Partner everyone once, oppose everyone twice |
| Other | N-1 | Varies | Berger table rotation (partner everyone once) |

**Court Rotation**: Players automatically rotate between courts each round — the algorithm tracks court history and optimizes assignments.

**Additional Rounds**: When adding rounds on-demand, the algorithm:
- Prioritizes players who've played fewer matches
- Avoids recent partner/opponent pairings
- Handles byes for odd player counts

## Development

```bash
npm run dev      # Vite (HMR, :3000) + wrangler pages dev (/api/*, :8788); Ctrl-C stops both
npm run dev:vite # Vite only (no /api — sharing won't work)
npm run build    # Production build
npm run preview  # Preview production build locally (no /api)
```

`npm run dev` ([`scripts/dev.mjs`](scripts/dev.mjs)) runs the Pages Functions in `wrangler pages dev` and Vite proxies `/api` to it. KV data persists in `.wrangler/state/` (delete to reset). Override the API port with `API_PORT=8789 npm run dev`; extra args go to Vite (`npm run dev -- --port 3001`).

## Project Structure

```
├── App.tsx              # Main React component (UI + state)
├── GameViewer.tsx       # Read-only viewer for shared tournaments
├── types.ts             # TypeScript interfaces
├── components/          # Shared UI pieces (share modal, …)
├── hooks/               # useShareSync (live sharing), usePolling (viewers)
├── utils/
│   ├── scheduler.ts     # Tournament scheduling + additional rounds
│   └── tournamentFile.ts # YAML export/import + validation
├── functions/           # Cloudflare Pages Functions (serverless API)
│   ├── api/
│   │   ├── game.ts      # POST /api/game - create shared tournament
│   │   └── game/[id]/index.ts # GET/PUT/DELETE /api/game/:id
│   ├── types.ts         # API types
│   └── words.ts         # Spanish words for share IDs (e.g. /game/bala-zapato)
├── index.tsx            # React entry point + routing
├── index.html           # HTML shell + OG meta tags
├── scripts/dev.mjs      # Local dev: Vite + wrangler pages dev
├── wrangler.toml        # Cloudflare config (KV bindings)
└── CLAUDE.md            # AI agent context file
```

## Deployment

The app is deployed on **Cloudflare Pages** (Git integration: build `npm run build`, output `dist`, Node from `.nvmrc`).

- Push to `main` → deploys to production
- Create a PR → generates a preview deployment

### Cloudflare configuration

No environment variables are needed. The KV namespace `TOURNAMENTS` (binding in `wrangler.toml`) stores shared tournaments.

### Docker (self-hosted)

The image runs the full app — frontend, `/api/*` Pages Functions and a local KV store — with `wrangler pages dev` (same `workerd` runtime as Cloudflare).

**Docker Compose** (simplest):

```bash
docker compose up -d --build   # → http://localhost:8788
docker compose logs -f         # logs
docker compose down            # stop (data kept in the padel-data volume; add -v to wipe it)
```

Optional: `HOST_PORT=8080` (host port, default 8788) in a `.env` file next to `docker-compose.yml` (gitignored).

Prebuilt image: `docker pull jotacor/padelamericano:latest` (published by CI from `main`).

**Plain Docker:**

```bash
docker build -t padel-americano .
docker run -d --name padel -p 8788:8788 \
  -v padel-data:/data \
  padel-americano
```

Open [http://localhost:8788](http://localhost:8788).

| Option | Description |
|--------|-------------|
| `-v padel-data:/data` | Persists shared tournaments (KV) across restarts; still expire 24 h after the last change |
| `-e PORT` | Internal port (default `8788`) |

**CI** ([`.github/workflows/docker.yml`](.github/workflows/docker.yml)): every push to `main` builds the image and pushes `jotacor/padelamericano:latest` and `:<short-sha>` to Docker Hub (PRs don't trigger it). Needs the repo secret `DOCKER_PASSWORD` (a Docker Hub access token).

Extra arguments are passed to `wrangler pages dev` (e.g. `docker run ... padel-americano --log-level debug`). Put it behind a reverse proxy for HTTPS (needed for clipboard copy on non-localhost hosts).

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Open a PR — Cloudflare will generate a preview link
4. Merge after review

## License

MIT
