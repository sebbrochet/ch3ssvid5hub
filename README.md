# Ch3ssVid5 Hub

[![Deploy](https://github.com/sebbrochet/ch3ssvid5hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/sebbrochet/ch3ssvid5hub/actions/workflows/deploy.yml)
[![Version](https://img.shields.io/github/package-json/v/sebbrochet/ch3ssvid5hub)](https://github.com/sebbrochet/ch3ssvid5hub)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

A browsable catalog of annotated chess PGN files synced with YouTube videos. Preview games, search by YouTuber, opening, or tags, and import directly into [Ch3ssVid5](https://ch3ssvid5.sebbrochet.com/) with one click.

## Features

### Catalog

- **YouTube-organized library** — PGN files structured by YouTuber / playlist / video
- **Fuzzy search** — find games by player names, openings, YouTubers, tags, video titles
- **Faceted filters** — filter by YouTuber, result, variant, tags
- **URL-shareable filters** — search state persisted in the URL hash

### Game Preview

- **Board snippet** — read-only Chessground board auto-plays through the first 15 moves
- **Video extract** — embedded YouTube clip starting at the first timestamp
- **Metadata display** — players, result, opening, event, ratings, variant badge

### Import Integration

- **One-click import** — "Open in Ch3ssVid5" button generates a `?pgn=URL&folder=Path` link
- **Library organization** — games import into `<YouTuber>/<playlist>` folders in Ch3ssVid5

### Chess Variants

- **Chess960** — Fischer Random with custom starting positions
- **King of the Hill** — variant-aware catalog entries

### Internationalization

- **5 languages** — English, French, Spanish, German, Portuguese
- **Auto-detection** — uses browser language on first visit
- **Language switcher** — globe dropdown in header

### Responsive Design

- **Desktop** — sidebar filters + 3-column card grid
- **Tablet** — collapsible filter panel + 2-column grid
- **Mobile** — full-width cards, filter toggle, stacked detail

## Tech Stack

- **React 18** + TypeScript
- **Vite** — build tool and dev server
- **Chessground** — read-only chess board (Lichess)
- **chessops** — variant-aware move validation and FEN parsing
- **Fuse.js** — client-side fuzzy search
- **React Router** — hash-based routing for GitHub Pages
- **react-i18next** — internationalization (5 languages)
- **Playwright** — end-to-end testing

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
git clone https://github.com/sebbrochet/ch3ssvid5hub.git
cd ch3ssvid5hub
npm install
npm run build:catalog
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

Output in `dist/`.

### Preview Production Build

```bash
npm run build && npm run preview
```

Open [http://localhost:4173/ch3ssvid5hub/](http://localhost:4173/ch3ssvid5hub/)

## Content Pipeline

PGN files in `pgn/` are the source of truth. A build script parses them into a JSON catalog:

```bash
npm run build:catalog    # PGN → JSON (public/catalog/)
```

### Folder Structure

```Text
pgn/<youtuber-handle>/<playlist-name>/<video-title>.pgn
```

| Element  | Convention                                                 |
| -------- | ---------------------------------------------------------- |
| YouTuber | Handle without `@`, lowercase (`gothamchess`)              |
| Playlist | Original YouTube name, preserving casing and spaces        |
| Video    | Slugified title, max ~80 chars (`guess-the-elo-ep-47.pgn`) |

### PGN Format

```pgn
[Event "Game Analysis"]
[White "Player 1"]
[Black "Player 2"]
[Result "1-0"]
[VideoURL "https://www.youtube.com/watch?v=VIDEO_ID"]

1. e4 {[%ts 0:35]} e5 {[%ts 0:52]}
2. Nf3 {[%ts 1:15]} Nc6 {[%ts 1:28]}
```

Required headers: `Event`, `White`, `Black`, `Result`, `VideoURL`

## Development

### Code Quality

```bash
npm run lint          # ESLint
npm run format        # Prettier auto-fix
npm run typecheck     # TypeScript check
npm test              # Vitest unit tests
npm run validate      # All of the above
```

### Testing

**E2E tests** (Playwright) — 37 tests across 5 spec files:

```bash
npm run test:e2e                  # All browsers
npm run test:e2e:headed           # Headed mode
```

Covers: landing page, browse/search, game detail, i18n, mobile layout.

### PGN Validation

```bash
npm run validate:pgn    # Check all PGN files for required headers
```

### CI Pipeline

On push to `main`, GitHub Actions runs: validate PGN → build catalog → typecheck → lint → test → build → deploy.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add PGN files.

1. Fork the repo
2. Add PGN file(s) to `pgn/<youtuber>/<playlist>/`
3. Run `npm run validate:pgn && npm run build:catalog`
4. Submit a PR

## Deployment

Auto-deploys to GitHub Pages on push to `main`.

Live at: [https://ch3ssvid5hub.sebbrochet.com/](https://ch3ssvid5hub.sebbrochet.com/)

## License

[GPL-3.0-or-later](LICENSE)
