# 🎾 Padel Americano Manager

🌐 **English** · [Español](README.es.md)

Web app to run padel tournaments with friends or at the club: add the players, the app makes the matches, you enter the scores and the standings update by themselves. Works on a phone, no accounts, and can be shared live (a link for the players and a screen for the club TV).

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

## Features

- ✅ **Two modes**: *Americano* (every round ready at the start) and *League* (one round at a time; people can come and go), each with a *Classic* (everyone with and against everyone) or *By skill* variant
- ✅ **Rotating or fixed pairs**: rotating = a new partner every round; fixed = always the same partner
- ✅ **Automatic matches**: everyone plays with and against different people; optionally, matches balanced by skill or by standings
- ✅ **The courts you have**: choose how many courts (− / +); the rest sit out in turn
- ✅ **Court rotation**: each player moves around different courts
- ✅ **Quick scores**: matches to 11, 15 or 21 points (first to 6, 8 or 11 wins; type the loser's score and the winner fills in: 4 → 4-6) or best of 3 sets
- ✅ **Live standings**: wins, points, point difference (DIFF) and points per match
- ✅ **Finals**: quick *Final round* or a *Playoff* (semifinals + final) among the best
- ✅ **Extra rounds (+)** and **undo the last round** while it has no scores
- ✅ **Sharing**: read-only link for the players, standings screen for the TV (scrolls by itself) and texts to paste in WhatsApp ("Copy round", "Copy standings")
- ✅ **Save to a file**: export and import the tournament (`padel-league-tuesday-2026-10-04-v3.yaml`)
- ✅ **Info tab**: inside the app, everything you need to run a tournament (modes, variants, pairing, rests, scoring, finals)
- ✅ **Spanish by default** (English available), names always in capitals, no accounts: everything stays on the device

## How It Works

### Step by step

1. **Setup**: name the tournament (optional), add the players (at least 4) with their skill (Low, Medium, High), pick the mode (Americano or League), the variant (Classic or By skill), the pairs (rotating or fixed), the courts and the scoring (11, 15 or 21 points, or 3 sets).
2. **Start**: Americano creates every round; League creates the first one.
3. **Play**: *Matches* shows who plays on each court; enter the scores when they finish.
4. **Next round**: move on with the arrow (Americano) or press "Generate round" (League).
5. **Finish**: in *Scores* create the Final round or a Playoff. When the final is over, the champions are shown. *End tournament* (in red, in Setup) closes the tournament.

The app's *Info* tab sums all this up, handy during the tournament.

### Choosing a mode

| | **Americano** | **League** |
|---|---|---|
| **Rounds** | All ready at the start | One at a time ("Generate round") |
| **Players** | Fixed for the whole tournament | Add people and mark who is in or sitting out before each round |
| **Courts** | Chosen at the start | Can change between rounds |
| **Best for** | A closed group with time to play every round | Open sessions: people arrive late or leave early, unknown number of rounds |

### How matches are made

Americano has two variants:

| | **Classic** | **By skill** |
|---|---|---|
| **Goal** | Everyone plays the same, with and against everyone | Matches balanced by skill |
| **Skill** | Not used | Used every round |
| **Repeats** | No partnership repeats | Some partners and opponents repeat |
| **Rests** | The schedule comes first: with fewer courts someone may sit out twice in a row if there's no other way | Never two rests in a row (when fewer rest than play) |

**Americano Classic, rotating pairs**
- Every player partners each other player at most once and everyone plays **the same number of matches**.
- With 8, 9, 12, 13, 16, 17, 20, 21… players (multiples of 4 or one more) everyone partners **everyone**; with 8, 12 and 16 everyone also faces everyone exactly twice.
- With the rest (10, 11, 14, 15…) partnering everyone and playing the same is impossible: everyone plays the same and a few partnerships are missing.
- Rounds: players − 1 for multiples of 4, otherwise as many rounds as players. 8 players: 7 rounds; 10: 10.

**Americano Classic, fixed pairs**
- **Round robin**: each pair plays every other pair once, with whatever courts there are. With an odd number of pairs, one rests each round.

**Americano By skill, rotating pairs**
- Every round matches are **balanced by skill** (Low = 1, Medium = 2, High = 3; a team adds up its two players), avoiding repeated partners and opponents where possible.
- Those who sat out last round and those with fewer matches play first.

**Americano By skill, fixed pairs**
- Every round pairs play opponents of **similar level**, avoiding repeated opponents where possible. No round-robin guarantee.

**League Classic**
- A normal league: **everyone with and against everyone** (fixed pairs: each pair vs every other; rotating: partner everyone), no skill or standings.
- While everyone is in, it follows the Americano Classic schedule, round by round.
- If someone is missing, the round is played by those present with matchups not played yet; whoever was missing plays theirs later if there's time. Spare courts: those present with nothing pending play each other.
- The schedule comes first: someone may sit out two rounds in a row.

**League By skill**
- Before each round matches are made among the players who are in (active). Those who sat out last round and those with fewer matches play first.
- Repeated partners and opponents are avoided whenever possible.
- Matches are balanced by the **skill** you gave each player, so both teams are even.
- Option **Prioritize standings**: besides skill, it uses the results. Top players play with top players, bottom with bottom, and teams are balanced; it still rotates so everyone meets everyone. Skill matters most at first, results more and more as games are played. It uses the share of points won, not the total, so resting or arriving late isn't punished.
- **League By skill with fixed pairs**: each round the pairs that played least go first, against pairs of similar level, avoiding repeated opponents. If one member is out, the whole pair sits out. New pairs can be formed during the league.

### Courts and rests

- You choose the courts: 4 by default, up to 10, in both modes. If there are spare courts, it tells you how many go unused.
- Extra players sit out in turn. In the By skill variants **nobody sits out two rounds in a row** (unless more players rest than play). In the Classic variants the schedule comes first: with all courts it doesn't happen either, with fewer courts only if there's no other way for everyone to play with and against everyone.
- In Americano Classic, with fewer courts than players ÷ 4, the same matches of the schedule are spread over more rounds.
- Players move around courts so they aren't always on the same one.
- **Extra rounds (+)** in Americano: add rounds any time. Those who sat out and those with fewer matches play first, avoiding repeated partners and opponents.

### Scores

- **Scoring**: matches to 11p, 15p or 21p, or **3 sets**.
- With points, the first team to 6 (11p), 8 (15p) or 11 (21p) wins: 6-4 is valid, 7-4 isn't. Type the loser's score and the winner fills in (11p: type 4 → 4-6); type the winner's and then enter the loser's.
- With 3 sets: best of 3, tennis sets (6-0 to 6-4, 7-5 or 7-6 with a tie-break). If a team wins the first two sets, the third isn't played. In the standings, after wins it's **sets** that count (sets won and set difference), not games.
- **You can't move to the next round if a score isn't valid** (nobody reached the winning points, impossible sets, or half entered). Blank matches are allowed.
- In finished matches the winning team is shown in green.
- **Undo round**: removes the last round if nobody has entered scores (e.g. someone arrived late in a League). In Americano only extra rounds and finals can be undone.

### Standings

- Order: **wins → total points → point difference (DIFF)**. Winning the match counts first.
- Average points per match is also shown (for information only).
- With fixed pairs, standings are per pair.

### Finishing the tournament

In *Scores*, "Finish the tournament":

**Quick final round** (Americano only): one round.
- Rotating pairs: **1st + 3rd vs 2nd + 4th** on Court 1; everyone else plays on the other courts.
- Fixed pairs: 1st pair vs 2nd pair.

**Playoff** (every mode): semifinals and final, no 3rd-place match. **Everyone else rests.**
- Rotating pairs: the **top 8** make balanced teams: 1st+8th, 2nd+7th, 3rd+6th and 4th+5th.
  - Semifinal 1: (1st+8th) vs (4th+5th)
  - Semifinal 2: (2nd+7th) vs (3rd+6th)
- Fixed pairs: the **top 4 pairs**. Semifinal 1: 1st vs 4th. Semifinal 2: 2nd vs 3rd.
- When both semifinals are over, press "Create final": the two winning teams play it.
- In a League only active players take part. With a single court, each semifinal is its own round.

When the final is over, **Champions** and **Runners-up** are shown in the app, the shared link and the TV screen.

### Sharing

- **Share** creates an easy link (`/game/bala-zapato`) where players see rounds and standings (read-only; opens on the round being played).
- **Leaderboard display** (`/display/bala-zapato`): for the club TV. If the list doesn't fit, it scrolls down slowly and back up by itself.
- It updates with every score. The link expires 24 hours after the last change.
- **Copy round / Copy standings**: copies a text to paste in WhatsApp, e.g. `Court 1: ANA-LUIS vs MARTA-JUAN (7-4)`.

### Saving the tournament

- Everything is saved on the phone or browser itself; no account needed.
- **Export** downloads a `.yaml` file (e.g. `padel-league-tuesday-2026-10-04-v3.yaml`: mode, name, start date and version). Each export raises the version.
- **Import** loads a file to see the results or keep playing.
- Language: Spanish by default; English with the link in Setup or by adding `?lang=en` to the address.

---

## For developers

### Quick Start

**Prerequisites:** Node.js 20.19+

```bash
npm install   # Install dependencies
npm run dev   # Vite + API server
```

Open [http://localhost:3000](http://localhost:3000). Share, display and viewer links work locally too.

### Development

```bash
npm run dev      # Vite (HMR, :3000) + API server (server/index.ts, :8788, restarts on change); Ctrl-C stops both
npm run dev:vite # Vite only (no /api — sharing won't work)
npm test         # Unit tests (vitest)
npm run build    # Production build (dist/)
npm start        # Production server: dist/ + /api on :8788
```

`npm run dev` ([`scripts/dev.mjs`](scripts/dev.mjs)) runs the API server and Vite proxies `/api` to it. Shared tournaments are saved as JSON files in `./data` (delete to reset). Override the API port with `API_PORT=8789 npm run dev`; extra args go to Vite (`npm run dev -- --port 3001`).

### Project Structure

```
├── App.tsx              # Main React component (UI + state)
├── GameViewer.tsx       # Read-only viewer (/game/:id)
├── LeaderboardDisplay.tsx # Leaderboard display (/display/:id)
├── types.ts             # TypeScript interfaces
├── components/          # Shared UI pieces (share modal, Info tab, …)
├── hooks/               # useShareSync (live sharing), usePolling (viewers), useAutoScroll (TV)
├── utils/
│   ├── scheduler.ts     # Whist/Berger schedule, League rounds, extra rounds, packing into courts
│   ├── classicSchedule.ts # Americano schedule (Classic / By skill)
│   ├── ranking.ts       # League by standings
│   ├── fixedPairs.ts    # Fixed pairs
│   ├── playoff.ts       # Playoff (semifinals + final)
│   ├── leaderboard.ts   # Standings
│   └── tournamentFile.ts # YAML export/import + validation
├── server/              # Node server (no runtime dependencies)
│   ├── index.ts         # Entry: PORT, DATA_DIR, DIST_DIR
│   ├── app.ts           # /api/game (create/read/update/delete shares) + static files with SPA fallback
│   ├── store.ts         # One JSON file per shared tournament in DATA_DIR/shares
│   ├── secret.ts        # Write token (random, stored hashed)
│   └── words.ts         # Spanish words for share IDs (e.g. /game/bala-zapato)
├── index.tsx            # React entry point + routing
├── index.html           # HTML shell + OG meta tags
├── scripts/dev.mjs      # Local dev: Vite + API server
└── CLAUDE.md            # Detailed technical context (algorithms, conventions)
```

### Deployment

A single Docker container serves everything (frontend + API) and stores shared tournaments as files in `/data`. Point your domain at it (e.g. through Cloudflare's proxy) and put HTTPS in front.

**Docker Compose** (simplest):

```bash
docker compose up -d --build   # → http://localhost:8788
docker compose logs -f         # logs
docker compose down            # stop (data kept in the padel-data volume; add -v to delete it)
```

Optional: `HOST_PORT=8080` (host port, default 8788) in a `.env` file next to `docker-compose.yml` (gitignored).

Prebuilt image: `docker pull jotacor/padelamericano:latest` (published by CI from `main`). Portainer: create a stack from `docker-compose.yml`, swapping the volume for a host folder if you prefer (e.g. `/mnt/pool/apps/padel:/data`).

**Plain Docker:**

```bash
docker run -d --name padel -p 8788:8788 \
  -v padel-data:/data \
  jotacor/padelamericano:latest
```

Open [http://localhost:8788](http://localhost:8788).

| Option | Description |
|--------|-------------|
| `-v padel-data:/data` | Shared tournaments (`/data/shares/*.json`) survive restarts; each expires 24 h after its last change |
| `-e PORT` | Internal port (default `8788`) |

**CI**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck, tests and build on every push to `main`; [`.github/workflows/docker.yml`](.github/workflows/docker.yml) builds the image and pushes `jotacor/padelamericano:latest` and `:<short-sha>` to Docker Hub. Requires the repository secret `DOCKER_PASSWORD` (a Docker Hub access token).

### Contributing

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes and test locally (`npm run dev`, `npm run typecheck`, `npm test`)
3. Merge after review

### License

MIT
