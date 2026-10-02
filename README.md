# 🎾 Padel Americano Manager

A modern web app for running **Padel Americano** tournaments — the social format where players rotate partners each round so everyone plays with and against different people.

**Live at [padelme.io](https://padelme.io)**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare)

## Features

### Core Tournament
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
- ✅ **Shareable Links** — Share your tournament with spectators via unique URL
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
- ✅ **Tie-Breaking** — Sorted by total points → match wins → point differential

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Tournament Flow

1. **Setup** — Add players (4+ required, 8/12/16 for "perfect" balance)
2. **Configure Courts** — Rename courts for your venue (Tab between inputs)
3. **Generate** — Creates all rounds with optimal pairings
4. **Play** — Navigate through rounds, enter scores after each match
5. **Extend** — Add more rounds with "+" button if time permits
6. **Finals** — Create championship round from leaderboard
7. **Results** — See team champions and individual rankings

### Scheduling Algorithm

The app uses **Whist Tournament** logic:

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
npm run dev      # Development server with HMR
npm run build    # Production build
npm run preview  # Preview production build locally
```

## Project Structure

```
├── App.tsx              # Main React component (UI + state)
├── GameViewer.tsx       # Read-only viewer for shared tournaments
├── types.ts             # TypeScript interfaces
├── utils/
│   └── scheduler.ts     # Tournament scheduling + additional rounds
├── functions/           # Cloudflare Pages Functions (serverless API)
│   ├── api/
│   │   ├── game.ts      # POST /api/game - create shared tournament
│   │   ├── game/[id].ts # GET/PUT/DELETE /api/game/:id
│   │   └── nicknames.ts # POST /api/nicknames - AI nickname generation
│   └── types.ts         # API types
├── index.tsx            # React entry point + routing
├── index.html           # HTML shell + OG meta tags
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
