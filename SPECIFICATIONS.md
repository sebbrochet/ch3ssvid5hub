# Ch3ssVid5 Hub — Specifications

## 1. Overview

**Ch3ssVid5 Hub** is a single-page application (SPA) that serves as a browsable catalog of PGN files designed for use with [Ch3ssVid5](https://ch3ssvid5.sebbrochet.com/).  
Users can search, filter, preview, and import chess games directly into Ch3ssVid5 with one click.

### 1.1 Goals

- Provide a curated, community-driven library of annotated PGN files
- Make PGN discovery fast and intuitive (search, filter, tags)
- Offer quick game previews (auto-play board snippet + video extract) to help decide before importing
- Enable seamless import into Ch3ssVid5 via the `?pgn=URL&folder=Path` mechanism
- Support community contributions via two paths:
  - **In-app sharing** — users share games directly from Ch3ssVid5's game library (user-friendly, primary path)
  - **Pull Requests** — power users contribute PGN files via GitHub PRs (developer path)

### 1.2 Non-Goals

- Full PGN editing (that's Ch3ssVid5's job)
- User accounts or authentication (initial version)
- Heavy server-side infrastructure (lightweight endpoint for submissions is acceptable)
- Deep SEO for individual game pages (content evolves via contributions)

---

## 2. Architecture

### 2.1 High-Level Flow

```Text
pgn/                          Build Script                  SPA (React + Vite)
├── folder-a/          ──►    parse PGN files       ──►    catalog.json
│   ├── game1.pgn             extract metadata              per-game detail JSONs
│   └── game2.pgn             generate JSON catalog         static assets
├── folder-b/                                               GitHub Pages deploy
│   └── study.pgn
└── metadata.yaml (optional)
```

### 2.2 Tech Stack

| Layer        | Technology                | Rationale                                                 |
| ------------ | ------------------------- | --------------------------------------------------------- |
| UI Framework | React 18 + TypeScript     | Same stack as Ch3ssVid5, enables code sharing             |
| Build Tool   | Vite                      | Same as Ch3ssVid5, fast dev/build cycle                   |
| Chessboard   | Chessground (Phase 2)     | Same as Ch3ssVid5, read-only board for auto-play previews |
| Chess Logic  | chessops (Phase 2)        | Same as Ch3ssVid5, variant-aware (Chess960, KOTH, etc.)   |
| Routing      | React Router (HashRouter) | SPA on GitHub Pages without server config                 |
| Search       | Fuse.js                   | Client-side fuzzy search over JSON catalog                |
| Styling      | CSS Modules or plain CSS  | Lightweight, consistent with Ch3ssVid5                    |
| Hosting      | GitHub Pages              | Free, static, auto-deploy via GitHub Actions              |
| Build Script | Node.js (TypeScript)      | Runs at build time to parse PGN → JSON                    |
| Testing      | Vitest                    | Same as Ch3ssVid5                                         |
| i18n         | react-i18next             | 5 languages, same as Ch3ssVid5                            |

### 2.3 Project Structure

```Text
Ch3ssVid5-Hub/
├── pgn/                        # Source PGN files (content)
│   ├── gothamchess/            # Youtuber (handle without @)
│   │   ├── Guess The Elo/      # Playlist (original name)
│   │   │   ├── guess-the-elo-episode-47.pgn
│   │   │   └── guess-the-elo-episode-48.pgn
│   │   └── Opening Tierlist/
│   │       └── best-openings-for-beginners.pgn
│   ├── agadmator/
│   │   ├── World Championship 2024/
│   │   │   └── game-1-ding-gukesh.pgn
│   │   └── _standalone/        # Videos not in a playlist
│   │       └── most-beautiful-chess-game.pgn
│   └── sebbrochet/
│       └── Parties Lentes/
│           ├── sebastien-vs-jean-luc-2026.pgn
│           └── metadata.yaml   # Optional per-folder metadata
├── scripts/
│   └── build-catalog.ts        # PGN → JSON build script
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── CatalogBrowser.tsx   # Main browsing view
│   │   ├── GameCard.tsx         # Game summary card
│   │   ├── GameDetail.tsx       # Full game detail + preview
│   │   ├── BoardPreview.tsx     # Read-only auto-play board snippet
│   │   ├── VideoExtract.tsx     # YouTube embed extract or thumbnail
│   │   ├── SearchBar.tsx        # Search input + filters
│   │   ├── TagCloud.tsx         # Tag-based navigation
│   │   ├── FilterPanel.tsx      # Faceted filter sidebar
│   │   └── LandingPage.tsx      # SEO-friendly landing page
│   ├── hooks/
│   ├── i18n/
│   ├── types/
│   │   └── catalog.ts          # TypeScript types for catalog data
│   └── utils/
│       └── import-url.ts       # Ch3ssVid5 import link generation
├── public/
│   └── catalog/                # Generated JSON (build output)
│       ├── index.json          # Full catalog index
│       └── games/              # Per-game detail JSON files
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 3. Content Pipeline

### 3.1 PGN Source Files

PGN files are the **single source of truth**. They live in the `pgn/` folder, organized into a standardized three-level hierarchy that mirrors YouTube's own structure.

#### Folder Structure: `pgn/<youtuber>/<playlist>/<video>.pgn`

The folder structure maps directly to YouTube's content organization:

```Text
pgn/
├── <youtuber>/              # YouTube handle without @ (unique, immutable)
│   ├── <playlist>/          # YouTube playlist name (kept as-is)
│   │   ├── <video-title>.pgn  # One PGN file per YouTube video
│   │   └── ...
│   └── _standalone/         # Videos not belonging to any playlist
│       └── <video-title>.pgn
└── ...
```

**Conventions:**

| Element                    | Rule                                                                                                                                     | Example                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Youtuber folder            | YouTube handle without `@` (lowercase, unique by design)                                                                                 | `alexbanzea`, `gothamchess`, `agadmator`                     |
| Playlist folder            | Original YouTube playlist name, preserving casing, spaces, and accents. Only filesystem-unsafe characters are removed (`: * ? " < > \|`) | `Guess The Elo`, `World Championship 2024`, `Parties Lentes` |
| Video file                 | Slugified video title, truncated to ~80 chars                                                                                            | `master-the-caro-kann-in-30-minutes.pgn`                     |
| No playlist                | Use `_standalone` as the playlist folder                                                                                                 | `agadmator/_standalone/most-beautiful-game.pgn`              |
| Special chars in playlists | Keep accents and unicode; only strip filesystem-unsafe chars                                                                             | `Débuts pour débutants` → kept as-is                         |
| Special chars in filenames | Slugify (lowercase, hyphens, ASCII only)                                                                                                 | `jérôme` → `jerome`                                          |
| Multi-game PGN             | One `.pgn` file per video, may contain multiple games                                                                                    | Matches the 1:1 video mapping                                |

> **Handle vs. display name:** The YouTube handle (`@AlexBanzea` → folder `alexbanzea`) is unique and immutable — it’s used as the folder key. The display name ("IM Alex Banzea") is not unique and can change — it’s stored in metadata for UI display but not used in paths.

**Why this structure:**

- **Deduplication** — same YouTube video = same file path; duplicates are caught immediately in PRs
- **Intuitive contributions** — folder structure is dictated by YouTube's own organization
- **Clean import path** — importing into Ch3ssVid5 places the game into `<youtuber>/<playlist>` in the library
- **Familiar browsing** — users already think in terms of "GothamChess's Guess the Elo playlist"

#### PGN Headers Used

Standard PGN headers extracted by the build script:

| Header     | Usage                                       |
| ---------- | ------------------------------------------- |
| `Event`    | Event name, used for display and search     |
| `Site`     | Site/platform (e.g., Lichess, Chess.com)    |
| `Date`     | Game date, used for sorting and filtering   |
| `Round`    | Round number                                |
| `White`    | White player name                           |
| `Black`    | Black player name                           |
| `WhiteElo` | White player rating                         |
| `BlackElo` | Black player rating                         |
| `Result`   | Game result (`1-0`, `0-1`, `1/2-1/2`, `*`)  |
| `ECO`      | Opening ECO code (e.g., `B12`)              |
| `Opening`  | Opening name                                |
| `VideoURL` | YouTube video URL (Ch3ssVid5 custom header) |

#### Custom Headers

Additional headers supported for catalog enrichment:

| Header       | Usage                                                         |
| ------------ | ------------------------------------------------------------- |
| `VideoTitle` | Display name for the linked YouTube video                     |
| `Tags`       | Comma-separated tags (e.g., `endgame, rook, technique`)       |
| `Difficulty` | Skill level: `beginner`, `intermediate`, `advanced`           |
| `Language`   | Language of video commentary (e.g., `en`, `fr`)               |
| `Annotator`  | Standard PGN header — person who annotated/created this study |

### 3.2 Optional Metadata Sidecar

A `metadata.yaml` file can be placed alongside PGN files to add metadata that doesn't fit in PGN headers.

#### Per-youtuber metadata (`pgn/<youtuber>/metadata.yaml`)

Optional. Stores overrides and defaults for all games by this youtuber:

```yaml
# pgn/alexbanzea/metadata.yaml
displayName: 'IM Alex Banzea' # Optional — auto-fetched from YouTube if omitted
defaults:
  language: fr
  annotator: 'Alex Banzea'
```

The `displayName` field maps the handle (`alexbanzea`) to the human-readable name shown in the UI. If omitted, the build script **auto-fetches** it from YouTube's oEmbed API:

```
GET https://www.youtube.com/oembed?url=https://www.youtube.com/@alexbanzea&format=json
→ { "author_name": "IM Alex Banzea", ... }
```

- If `displayName` is set in `metadata.yaml`, it takes precedence (manual override)
- If `metadata.yaml` doesn't exist or has no `displayName`, the build script fetches it from oEmbed
- Fetched display names are cached locally (e.g., `.display-name-cache.json`) to avoid repeated API calls during development
- If both `metadata.yaml` and oEmbed fail, the handle itself is used as the display name

#### Per-playlist metadata (`pgn/<youtuber>/<playlist>/metadata.yaml`)

Adds playlist-level defaults or per-file overrides:

```yaml
# pgn/agadmator/World Championship 2024/metadata.yaml
defaults:
  tags: [world-championship, 2024]
  difficulty: advanced
  language: en

overrides:
  - file: game-1-ding-gukesh.pgn
    tags: [world-championship, grunfeld, 2024]
    description: 'Ding Liren vs Gukesh - Game 1'
```

- `defaults` apply to all PGN files in the folder
- `overrides` target specific files
- PGN header values take precedence over sidecar values

### 3.3 Build Script (`scripts/build-catalog.ts`)

Runs as a pre-build step (`npm run build:catalog`) and generates:

#### Output: `public/catalog/index.json`

Compact catalog index used by the SPA for browsing and search:

```json
{
  "version": 1,
  "generatedAt": "2026-05-02T12:00:00Z",
  "totalGames": 42,
  "games": [
    {
      "id": "agadmator-world-championship-2024-game-1-ding-gukesh-0",
      "youtuber": "agadmator",
      "playlist": "World Championship 2024",
      "fileName": "game-1-ding-gukesh.pgn",
      "gameIndex": 0,
      "white": "Ding, Liren",
      "black": "Gukesh, D",
      "whiteElo": 2762,
      "blackElo": 2783,
      "result": "1/2-1/2",
      "date": "2024.11.25",
      "event": "World Championship 2024",
      "eco": "D85",
      "opening": "Grünfeld Defense",
      "moveCount": 39,
      "videoTitle": "Game 1 | Ding Liren vs Gukesh | World Championship 2024",
      "hasTimestamps": true,
      "tags": ["world-championship", "grunfeld", "2024"],
      "difficulty": "advanced",
      "language": "en",
      "annotator": "agadmator"
    }
  ],
  "tags": ["world-championship", "grunfeld", "opening", "endgame"],
  "openings": ["Grünfeld Defense", "Sicilian Defense"],
  "players": ["Ding, Liren", "Gukesh, D"],
  "youtubers": ["agadmator", "gothamchess", "sebbrochet"],
  "annotators": ["agadmator"]
}
```

#### Output: `public/catalog/games/{id}.json`

Detailed per-game JSON for the detail view:

```json
{
  "id": "agadmator-world-championship-2024-game-1-ding-gukesh-0",
  "headers": {
    "Event": "World Championship 2024",
    "White": "Ding, Liren",
    "Black": "Gukesh, D",
    "Result": "1/2-1/2",
    "ECO": "D85",
    "Opening": "Grünfeld Defense",
    "VideoURL": "https://www.youtube.com/watch?v=XXXXX"
  },
  "pgn": "1. d4 {[%ts 1:20]} Nf6 {[%ts 1:35]} 2. c4 ...",
  "pgnFileUrl": "https://raw.githubusercontent.com/sebbrochet/ch3ssvid5hub/main/pgn/agadmator/World%20Championship%202024/game-1-ding-gukesh.pgn",
  "importUrl": "https://ch3ssvid5.sebbrochet.com/?pgn=https%3A%2F%2Fraw.githubusercontent.com%2F...&folder=agadmator%2FWorld%20Championship%202024",
  "firstMoves": "1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5",
  "startingFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "description": "Ding Liren vs Gukesh - Game 1 of the 2024 World Championship"
}
```

### 3.4 Build Script Behavior

- Recursively scans `pgn/` for `.pgn` files
- Parses each PGN file (handles multi-game PGN)
- Merges metadata from sidecar YAML files
- **Resolves youtuber display names**: reads from `metadata.yaml` if present, otherwise fetches from YouTube oEmbed API (cached in `.display-name-cache.json`)
- Generates deterministic IDs from youtuber + playlist + filename + game index
- Computes the import URL for Ch3ssVid5 (properly encoded)
- Writes `index.json` and individual game JSON files to `public/catalog/`
- Validates PGN parse-ability (warns on malformed files, skips them)
- Runs before `vite build` in the CI pipeline

---

## 4. User Interface

### 4.1 Pages / Views

The SPA has three main views, using hash-based routing:

#### Landing Page (`#/`)

- Hero section with project name, tagline, and brief description
- Quick stats (total games, total youtubers, total playlists)
- Featured/recent additions
- Call to action: "Browse Games" and "Contribute"
- This is the only page optimized for SEO (static `index.html` content)

#### Browse / Search (`#/browse`)

- **Search bar** — full-text fuzzy search across youtuber, playlist, player names, event, opening, tags, video title, annotator
- **Filter panel** (sidebar or collapsible) with faceted filters:
  - Youtuber (channel name)
  - Playlist
  - Tags (multi-select, shows count)
  - Opening / ECO code
  - Player name
  - Result (`1-0`, `0-1`, `1/2-1/2`)
  - Has timestamps (yes/no)
  - Difficulty level
  - Language
  - Annotator
- **Results grid** — responsive grid of `GameCard` components
- **Sort options** — by date, player name, opening, recently added
- **Pagination** or infinite scroll for large catalogs
- **URL state** — filters and search query reflected in the URL hash for shareability

#### Game Detail (`#/game/:id`)

- Full game metadata display (all headers)
- **Game preview** — a passive "trailer" to help the user decide before importing:
  - **Board snippet** — read-only Chessground board that auto-plays through a portion of the game (e.g., first 15 moves or a key sequence), no user interaction (no dragging, no manual navigation)
  - **Video extract** — if the game has a VideoURL, embed a short YouTube clip starting at the first timestamp (or show the video thumbnail with a play button); gives a taste of the commentary
  - The preview is intentionally limited — it should entice, not replace Ch3ssVid5
- **Move list** — first 10-15 moves displayed as text (read-only)
- **Tags** — clickable, navigate back to browse with that tag filtered
- **"Open in Ch3ssVid5" button** — prominent CTA, opens the import URL
  - Primary action for synced games (with VideoURL)
  - Shows the import URL for transparency
- **PGN download** — direct link to the raw PGN file
- **Breadcrumb** — path-based navigation (e.g., Home > Openings > Caro-Kann)

### 4.2 Components

| Component        | Description                                                                     |
| ---------------- | ------------------------------------------------------------------------------- |
| `LandingPage`    | Hero, stats, featured games, CTA                                                |
| `CatalogBrowser` | Search + filters + results grid                                                 |
| `SearchBar`      | Text input with debounced Fuse.js search                                        |
| `FilterPanel`    | Faceted filter sidebar with checkboxes and counts                               |
| `GameCard`       | Compact card: players, opening, result, tags, video icon                        |
| `GameDetail`     | Full detail page with passive preview (board + video extract) and import button |
| `BoardPreview`   | Read-only Chessground board, auto-plays through a game snippet (no interaction) |
| `VideoExtract`   | YouTube embed starting at first timestamp, or thumbnail fallback                |
| `TagCloud`       | Visual tag display with click-to-filter                                         |
| `ImportButton`   | "Open in Ch3ssVid5" button with URL generation                                  |
| `Header`         | Site header with navigation and language switcher                               |
| `Footer`         | Links to Ch3ssVid5, GitHub, contribution guide                                  |

### 4.3 Responsive Design

| Breakpoint          | Layout                                                    |
| ------------------- | --------------------------------------------------------- |
| Desktop (≥1024px)   | Sidebar filters + 3-column card grid                      |
| Tablet (768–1023px) | Collapsible filter panel + 2-column grid                  |
| Mobile (<768px)     | Full-width cards, filter as overlay/modal, stacked detail |

### 4.4 Theme

- Clean, modern design consistent with Ch3ssVid5's aesthetic
- Light theme (dark theme as future enhancement)
- Chess-themed accent colors

---

## 5. Import Integration with Ch3ssVid5

### 5.1 Import URL Format

```Text
https://ch3ssvid5.sebbrochet.com/?pgn={encoded_pgn_url}&folder={encoded_folder_path}
```

- `pgn` — URL-encoded link to the raw PGN file on GitHub
- `folder` — URL-encoded folder path for organization in Ch3ssVid5's game library

### 5.2 PGN File URL

The raw PGN URL follows the pattern:

```Text
https://raw.githubusercontent.com/{owner}/{repo}/main/pgn/{youtuber}/{playlist}/{video-title}.pgn
```

The build script generates this URL based on the repository configuration.

### 5.3 Domain Allowlist

Ch3ssVid5 restricts import URLs to an allowlist. Ch3ssVid5 Hub's PGN files must be served from an allowed domain:

- `raw.githubusercontent.com` — GitHub raw content (already allowed)

### 5.4 Multi-Game PGN Handling

When a PGN file contains multiple games:

- Each game gets its own catalog entry and detail page
- The import URL points to the full PGN file (Ch3ssVid5 handles multi-game display)
- The `folder` parameter uses `<youtuber>/<playlist>` as the library path

---

## 6. Search and Filtering

### 6.1 Client-Side Search

Using **Fuse.js** for fuzzy search across the catalog index:

**Searchable fields** (weighted):

1. Youtuber name — high weight
2. Player names (white, black) — high weight
3. Opening name — high weight
4. Playlist name — medium weight
5. Event name — medium weight
6. Tags — medium weight
7. Video title — medium weight
8. Annotator — low weight
9. ECO code — low weight

### 6.2 Faceted Filters

Filters operate as AND between categories, OR within a category:

```Text
(tag:endgame OR tag:rook) AND (result:1-0) AND (hasVideo:true)
```

Filter counts update dynamically based on current selection.

### 6.3 URL State

Filter state is serialized in the URL hash for shareability:

```Text
#/browse?q=kasparov&youtuber=agadmator&tags=endgame,tactics&result=1-0&sort=date
```

---

## 7. Contribution Workflow

Two contribution paths serve different user profiles:

### 7.1 In-App Sharing (Primary — User-Friendly)

Users share games directly from Ch3ssVid5 without leaving the app:

#### User Flow (Ch3ssVid5 side)

1. User right-clicks a game in the Ch3ssVid5 Game Library
2. Selects **"Share to Community"** from the context menu
3. A dialog opens where the user fills in metadata:
   - Tags (suggested from existing tag list + free-form)
   - Difficulty level
   - Language of commentary
   - Brief description
   - Annotator name / alias
4. User submits — the PGN + metadata are sent to a submission endpoint
5. User sees a confirmation: "Game submitted for review"

#### Moderation Flow (Hub side)

1. Submitted games land in a **moderation queue** (pending approval)
2. Maintainer reviews submissions (content, quality, relevance)
3. Approved games are added to the `pgn/` folder and the catalog is rebuilt
4. Rejected games are discarded (optionally with feedback)

#### Implementation (TBD)

The exact mechanism for the submission pipeline is not yet decided. Possible approaches:

| Option                                        | Pros                                                                                     | Cons                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| GitHub Issues API                             | No backend needed; submissions become issues with PGN attached; maintainer merges via PR | Requires GitHub token or OAuth; issue-based workflow is indirect |
| GitHub PR API                                 | Direct: submission creates a PR with the PGN file                                        | Requires GitHub OAuth for the submitter                          |
| External form service                         | Simple (e.g., Formspree, Google Forms)                                                   | PGN as attachment is clunky; extra dependency                    |
| Lightweight backend (e.g., Cloudflare Worker) | Full control; receives PGN, stores in queue, exposes moderation API                      | Introduces server-side infrastructure                            |
| Peer-to-peer (WebRTC)                         | No server; direct transfer to maintainer                                                 | Requires both parties online; not practical                      |

The chosen approach must:

- Require **no account creation** for the submitter (ideally)
- Support **PGN files of any size** (multi-game studies can be large)
- Provide a **moderation step** before publication
- Be **automatable** (approved submission → PR → merge → deploy)

> **Note:** This feature requires changes in both Ch3ssVid5 (context menu, share dialog, submission client) and the Hub (moderation queue, intake endpoint). The two projects will need a shared contract for the submission format.

### 7.2 PR-Based Contribution (Secondary — Developer Path)

For power users comfortable with Git/GitHub:

1. Contributor forks the repository
2. Adds PGN file(s) to the appropriate folder under `pgn/`
3. Optionally adds/updates `metadata.yaml` for extra metadata
4. Opens a Pull Request
5. CI pipeline validates:
   - PGN files parse correctly
   - Required headers are present (`Event`, `White`, `Black`, `Result`)
   - No duplicate game IDs
   - Catalog builds successfully
6. Maintainer reviews and merges
7. GitHub Actions rebuilds catalog and deploys

### 7.3 Contribution Guidelines

A `CONTRIBUTING.md` file will document:

- How to share a game from Ch3ssVid5 (in-app path)
- How to structure PGN files for PR-based contributions
- Required and optional PGN headers
- How to add tags and metadata
- Folder naming conventions
- How to test locally before submitting

### 7.4 CI Validation

The GitHub Actions pipeline runs on PRs:

```Text
validate PGN → build catalog → typecheck → lint → test → build SPA
```

---

## 8. Deployment

### 8.1 GitHub Pages

- Auto-deploy on push to `main` via GitHub Actions
- Static output in `dist/`
- Base path: `/ch3ssvid5hub/` (or custom domain)

### 8.2 Build Pipeline

```bash
npm run build:catalog   # PGN → JSON (scripts/build-catalog.ts)
npm run build           # Vite build (bundles SPA + catalog JSON)
```

Combined in CI:

```bash
npm run build:catalog && npm run build
```

### 8.3 GitHub Actions Workflow

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build:catalog
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4 # deploy on main only
```

---

## 9. Internationalization

### 9.1 Supported Languages

- English (default)
- French
- Spanish
- German
- Portuguese

### 9.2 Scope

- All UI labels, buttons, placeholders
- Landing page content
- Filter labels and sort options
- Game metadata labels (not the PGN content itself)

### 9.3 Implementation

- `react-i18next` with JSON translation files
- Language switcher in header (same pattern as Ch3ssVid5)
- Browser language auto-detection on first visit
- Persisted in `localStorage`

---

## 10. Future Considerations

These are explicitly **out of scope** for the initial version but inform architectural decisions:

| Feature                    | Impact on Architecture                                        |
| -------------------------- | ------------------------------------------------------------- |
| User accounts              | Will need a backend; keep UI components stateless             |
| Favorites / bookmarks      | localStorage initially, then user accounts                    |
| Ratings / reviews          | Requires backend API                                          |
| Submission status tracking | Let submitters see if their game was approved/rejected        |
| Community comments         | Requires backend or third-party (e.g., Giscus)                |
| Dark theme                 | CSS custom properties from the start                          |
| Richer board preview       | Could add manual navigation or embed full Ch3ssVid5 in iframe |
| Analytics                  | Privacy-respecting (Plausible/Umami)                          |

---

## 11. Development Milestones

### Phase 1: Foundation ✅

- [x] Project setup (React + Vite + TypeScript)
- [x] Build script: PGN parsing → JSON catalog
- [x] Catalog types and data model
- [x] Basic routing (landing, browse, detail)
- [x] Game card component
- [x] Import URL generation

### Phase 2: Core UX ✅

- [x] Search bar with Fuse.js
- [x] Filter panel with faceted filters (YouTuber, Result, Variant, Tags)
- [x] Game detail page with breadcrumbs, clickable tags, opening moves
- [x] Game preview: auto-play board snippet (Chessground + chessops) + video extract (YouTube embed)
- [x] Responsive layout (desktop sidebar, tablet/mobile collapsible filters)

### Phase 3: Polish ✅

- [x] Landing page with stats and translated content
- [x] Internationalization (EN/FR/ES/DE/PT — 5 languages, matching Ch3ssVid5)
- [x] Language switcher in header (globe dropdown)
- [x] URL state for filters (search params in hash)
- [x] CI pipeline and GitHub Pages deployment (GitHub Actions workflow)

### Phase 4: Community ✅

- [x] PR-based contribution path (CONTRIBUTING.md, PR template, CI validation)
- [x] PGN validation script (`scripts/validate-pgn.ts`) with required header checks
- [x] Initial PGN content seeded (4 files, 7 games, 4 YouTubers)
- [x] Fixed PGN header issues caught by validation

### Phase 5: In-App Sharing

- [ ] Define submission format contract (Ch3ssVid5 ↔ Hub)
- [ ] Choose and implement submission pipeline (see §7.1)
- [ ] "Share to Community" context menu + dialog in Ch3ssVid5
- [ ] Moderation queue / review workflow
- [ ] Auto-merge approved submissions into catalog

---

## Appendix A: Example PGN File

```pgn
[Event "World Championship 2024 - Game 1"]
[Site "YouTube"]
[Date "2024.11.25"]
[Round "1"]
[White "Ding, Liren"]
[Black "Gukesh, D"]
[Result "1/2-1/2"]
[ECO "D85"]
[Opening "Grünfeld Defense"]
[VideoURL "https://www.youtube.com/watch?v=EXAMPLE"]
[VideoTitle "Game 1 | Ding Liren vs Gukesh | World Championship 2024"]
[Tags "world-championship, grunfeld, 2024"]
[Difficulty "advanced"]
[Language "en"]
[Annotator "agadmator"]

1. d4 {[%ts 1:20]} Nf6 {[%ts 1:35]}
2. c4 {[%ts 2:10]} g6 {[%ts 2:25]}
3. Nc3 {[%ts 2:50]} d5 {[%ts 3:15]}
4. cxd5 {[%ts 3:40]} Nxd5 {[%ts 4:00]}
1/2-1/2
```

## Appendix B: Configuration

The build script reads a `hub.config.ts` (or similar) for repository-specific settings:

```typescript
export default {
  // GitHub repository for raw PGN URLs
  repository: {
    owner: 'sebbrochet',
    repo: 'ch3ssvid5hub',
    branch: 'main',
  },

  // Ch3ssVid5 instance for import URLs
  ch3ssvid5: {
    baseUrl: 'https://ch3ssvid5.sebbrochet.com/',
  },

  // PGN source directory
  pgnDir: 'pgn',

  // Catalog output directory
  catalogDir: 'public/catalog',

  // Required PGN headers (build warns if missing)
  requiredHeaders: ['Event', 'White', 'Black', 'Result', 'VideoURL'],
};
```
