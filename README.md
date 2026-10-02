# 🎾 Padel Americano Manager

A modern web app for running **Padel Americano** tournaments — the social format where players rotate partners each round so everyone plays with and against different people.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare)

## Features

### Core Tournament
- ✅ **Fixed Pairs** — Optional in both modes: pick partners yourself, only opponents rotate
- ✅ **Two Modes** — *Random* (all rounds pre-generated, Whist logic) and *League* (rounds one at a time, skill-balanced, players can join/sit out between rounds)
- ✅ **Smart Scheduling** — Mathematically optimal "Whist" schedules for 8, 12, and 16 players
- ✅ **Court Rotation** — Algorithm ensures players rotate across different courts each round
- ✅ **Custom Court Names** — Label courts (e.g., "Center Court", "Court A") for easy callouts
- ✅ **Live Scoring** — Enter scores per round, see leaderboard update in real-time
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
- ✅ **Auto-cleanup** — Shared tournaments expire after 24 hours

### AI-Powered Features
- ✅ **AI Nicknames** — Generate fun padel-themed nicknames for players (powered by Anthropic Claude)
- ✅ **Optional** — Checkbox to enable/disable nickname generation

### User Experience
- ✅ **Mobile-First** — Responsive design works great on phones at the courts
- ✅ **Keyboard Navigation** — Arrow keys to navigate between rounds
- ✅ **Multi-language** — English & Spanish (EN/ES switcher on every view, auto-detects browser language)
- ✅ **Offline Ready** — All data persists in localStorage, no account needed
- ✅ **Export / Import (YAML)** — Save a tournament to a human-readable `.yaml` file and load it later to see results or keep playing; each export bumps a `revision` and appends to a `history` log inside the file
- ✅ **Tie-Breaking** — Sorted by total points → match wins → point differential

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start dev server (Vite + Pages Functions + local KV)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Sharing, display and viewer links all work locally.

Optional — AI nicknames: create `.dev.vars` (gitignored) with `ANTHROPIC_API_KEY=sk-ant-...` and restart `npm run dev`.

## How It Works

### Tournament Flow

1. **Setup** — Add players with a skill level (4+ required; 8/12/16 for "perfect" Whist balance), pick a mode and pair modality
2. **Configure Courts** — Rename courts for your venue (Tab between inputs)
3. **Start** — *Random* creates all rounds up front; *League* generates them one at a time
4. **Play** — Navigate through rounds, enter scores after each match
5. **Extend** — Add more rounds with "+" button if time permits
6. **Finals** — Create championship round from leaderboard
7. **Results** — See team champions and individual rankings

### Tournament Modes

| | **Random** (default) | **Random + "Prioritize skill"** | **League** |
|---|---|---|---|
| **Rounds** | All generated at start (N−1, or N if odd) | All generated at start (same count) | One at a time ("Generate round N") |
| **Partners** | Whist / Berger rotation: everyone partners everyone once | Chosen each round to balance skill | Chosen each round to balance skill |
| **Skill level** | Only decides who takes which slot of the schedule. No effect with 8/12/16 (every assignment is equally balanced); helps other sizes | Main criterion: groups of 4 and team splits as even as possible | Main criterion: groups of 4 and team splits as even as possible |
| **Repeats** | None: no repeated partners, opponents spread evenly | Some partners repeat, others never meet (8 players: ~7 of 28 pairs) | Avoided where possible (penalized, not forbidden) |
| **Match balance** (8 players, mixed skills) | Avg skill gap per match ≈ 1.36 | ≈ 0.64 | Similar to "Prioritize skill" |
| **Roster** | Locked once started | Locked once started | Add players and toggle active/resting between rounds |
| **Who plays** | Fixed by the schedule (byes rotate) | Fewest matches played first | Fewest matches played first, active players only |
| **Courts** | Players ÷ 4 | Players ÷ 4 | You choose (default 4); extra players rest |
| **Extra rounds (+)** | Fair rotation avoiding repeats, skill-even opponents | Same algorithm as League | Next round button |
| **Finals** | 1st+3rd vs 2nd+4th | 1st+3rd vs 2nd+4th | — |
| **Best for** | Closed group with time for the full schedule | Mixed-level group where even matches matter more than meeting everyone | Open sessions where people arrive/leave, unknown number of rounds |

Skill levels count as Low = 1, Medium = 2, High = 3 (a team's skill is the sum of both players).

**Fixed pairs** (optional in both modes, *Pairs: Fixed*): you pair players yourself and only opponents rotate.

| | **Random + Fixed pairs** | **League + Fixed pairs** |
|---|---|---|
| **Schedule** | Full round robin: every pair meets every other pair once | One round at a time: fewest-played pairs first, avoid repeat opponents, balance pair skill |
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
npm run dev:vite # Vite only (no /api — sharing/nicknames won't work)
npm run build    # Production build
npm run preview  # Preview production build locally (no /api)
```

`npm run dev` ([`scripts/dev.mjs`](scripts/dev.mjs)) runs the Pages Functions in `wrangler pages dev` and Vite proxies `/api` to it. KV data persists in `.wrangler/state/` (delete to reset). Secrets go in `.dev.vars`. Override the API port with `API_PORT=8789 npm run dev`; extra args go to Vite (`npm run dev -- --port 3001`).

## Project Structure

```
├── App.tsx              # Main React component (UI + state)
├── GameViewer.tsx       # Read-only viewer for shared tournaments
├── types.ts             # TypeScript interfaces
├── utils/
│   ├── scheduler.ts     # Tournament scheduling + additional rounds
│   └── tournamentFile.ts # YAML export/import + validation
├── functions/           # Cloudflare Pages Functions (serverless API)
│   ├── api/
│   │   ├── game.ts      # POST /api/game - create shared tournament
│   │   ├── game/[id].ts # GET/PUT/DELETE /api/game/:id
│   │   └── nicknames.ts # POST /api/nicknames - AI nickname generation
│   ├── types.ts         # API types
│   └── words.ts         # Spanish words for share IDs (e.g. /game/bala-zapato)
├── index.tsx            # React entry point + routing
├── index.html           # HTML shell + OG meta tags
├── scripts/dev.mjs      # Local dev: Vite + wrangler pages dev
├── wrangler.toml        # Cloudflare config (KV bindings)
└── CLAUDE.md            # AI agent context file
```

## Deployment

The app is deployed on **Cloudflare Pages** at [padelme.io](https://padelme.io).

- Push to `main` → deploys to production
- Create a PR → generates a preview deployment

### Environment Variables (Cloudflare Pages)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for AI nickname generation |

KV Namespace `TOURNAMENTS` is used for cloud-synced tournament storage.

### Docker (self-hosted)

The image runs the full app — frontend, `/api/*` Pages Functions and a local KV store — with `wrangler pages dev` (same `workerd` runtime as Cloudflare).

**Docker Compose** (simplest):

```bash
docker compose up -d --build   # → http://localhost:8788
docker compose logs -f         # logs
docker compose down            # stop (data kept in the padel-data volume; add -v to wipe it)
```

Optional settings in a `.env` file next to `docker-compose.yml` (gitignored): `ANTHROPIC_API_KEY=sk-ant-...` (AI nicknames) and `HOST_PORT=8080` (host port, default 8788).

Prebuilt image: `docker pull jotacor/padelamericano:latest` (published by CI from `main`).

**Plain Docker:**

```bash
docker build -t padel-americano .
docker run -d --name padel -p 8788:8788 \
  -v padel-data:/data \
  -e ANTHROPIC_API_KEY=sk-ant-...  \
  padel-americano
```

Open [http://localhost:8788](http://localhost:8788).

| Option | Description |
|--------|-------------|
| `-v padel-data:/data` | Persists shared tournaments (KV) across restarts; still expire after 24h |
| `-e ANTHROPIC_API_KEY` | Optional — enables AI nicknames |
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

---

<details>
<summary>Original AI Studio Info</summary>

This project was bootstrapped with Google AI Studio.

View in AI Studio: https://ai.studio/apps/drive/1oXCLn8u0242Op7GnKGWZ8KPmGR3-3US1

</details>
