# Contributing to Ch3ssVid5 Hub

Thanks for helping grow the library of annotated chess games!

## How to Contribute a PGN

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/ch3ssvid5hub.git
cd ch3ssvid5hub
npm install
```

### 2. Add Your PGN File

Place your PGN file in the correct folder following the YouTube-based structure:

```Text
pgn/<youtuber-handle>/<playlist-name>/<video-title>.pgn
```

| Element         | Convention                                                    | Example                                |
| --------------- | ------------------------------------------------------------- | -------------------------------------- |
| Youtuber folder | YouTube handle without `@`, lowercase                         | `gothamchess`                          |
| Playlist folder | Original YouTube playlist name (keep casing, spaces, accents) | `Guess The Elo`                        |
| Video file      | Slugified video title (lowercase, hyphens, max ~80 chars)     | `guess-the-elo-episode-47.pgn`         |
| No playlist     | Use `_standalone`                                             | `agadmator/_standalone/some-video.pgn` |

### 3. Required PGN Headers

Every game **must** include these headers:

```pgn
[Event "..."]
[White "..."]
[Black "..."]
[Result "1-0"]
[VideoURL "https://www.youtube.com/watch?v=..."]
```

### 4. Recommended Headers

These make the catalog richer:

```pgn
[Site "Lichess"]
[Date "2024.11.25"]
[ECO "B12"]
[Opening "Caro-Kann Defense"]
[WhiteElo "2100"]
[BlackElo "1950"]
[VideoTitle "Full video title from YouTube"]
[Tags "opening, caro-kann, beginner-friendly"]
[Difficulty "intermediate"]
[Language "en"]
[Annotator "your-name"]
```

### 5. Timestamp Annotations

Add `[%ts M:SS]` annotations to sync moves with the YouTube video:

```pgn
1. e4 {[%ts 0:35]} e5 {[%ts 0:52]}
2. Nf3 {[%ts 1:15]} Nc6 {[%ts 1:28]}
```

### 6. Test Locally

```bash
npm run build:catalog    # Parse PGN → JSON catalog
npm run dev              # Start dev server and verify your game appears
```

### 7. Submit a Pull Request

- Push your branch and open a PR
- The CI pipeline will validate your PGN files
- A maintainer will review and merge

## Optional: Metadata Sidecar

You can add a `metadata.yaml` alongside PGN files for extra metadata:

**Per-youtuber** (`pgn/<youtuber>/metadata.yaml`):

```yaml
displayName: 'IM Alex Banzea'
defaults:
  language: fr
```

**Per-playlist** (`pgn/<youtuber>/<playlist>/metadata.yaml`):

```yaml
defaults:
  tags: [world-championship, 2024]
  difficulty: advanced
overrides:
  - file: game-1.pgn
    description: 'Game 1 analysis'
```

## Multi-Game PGN

One PGN file per YouTube video. If the video covers multiple games, include them all in the same `.pgn` file — each game gets its own catalog entry.

## Chess Variants

Supported variants: Chess960, King of the Hill, Three-check, Antichess. Add the `[Variant]` header:

```pgn
[Variant "Chess960"]
[SetUp "1"]
[FEN "rnbqnbkr/pppppppp/8/8/8/8/PPPPPPPP/RNBQNBKR w KQkq - 0 1"]
```

## Code of Conduct

Be respectful. Only submit content you have the right to share. PGN annotations should be original work.
