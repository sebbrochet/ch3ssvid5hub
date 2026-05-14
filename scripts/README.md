# Import Playlist CLI

Generate skeleton PGN files from a YouTube playlist, ready to be annotated.

## Prerequisites

A **YouTube Data API v3** key is required.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Enable **YouTube Data API v3**
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**

Set the key as an environment variable:

```powershell
# PowerShell
$env:YOUTUBE_API_KEY = "your-key"
```

```bash
# bash / zsh
export YOUTUBE_API_KEY="your-key"
```

## Usage

```bash
npx tsx scripts/import-playlist.ts --playlist <URL_OR_ID> [options]
```

### Options

| Flag                     | Description                                                 | Default                     |
| ------------------------ | ----------------------------------------------------------- | --------------------------- |
| `--playlist <url\|id>`   | YouTube playlist URL or playlist ID (**required**)          | —                           |
| `--youtuber <handle>`    | Override the YouTuber folder name                           | Auto-detected from channel  |
| `--playlist-name <name>` | Override the playlist folder name                           | Playlist title from YouTube |
| `--language <code>`      | Set `[Language]` header in generated PGNs (e.g. `en`, `fr`) | —                           |
| `--dry-run`              | Preview what would be created without writing files         | —                           |

### Examples

**Import a playlist:**

```bash
npx tsx scripts/import-playlist.ts --playlist "https://www.youtube.com/playlist?list=PLxxx"
```

**Dry run to preview:**

```bash
npx tsx scripts/import-playlist.ts --playlist PLxxx --dry-run
```

**Override youtuber handle and set language:**

```bash
npx tsx scripts/import-playlist.ts --playlist PLxxx --youtuber gothamchess --language en
```

## What It Does

1. **Fetches playlist metadata** — title and channel from the YouTube API
2. **Auto-detects the YouTuber handle** — from the channel's custom URL (e.g. `@gothamchess` → `gothamchess`)
3. **Creates the folder structure** — `pgn/<youtuber>/<playlist>/`
4. **Generates a `metadata.yaml`** — in the playlist folder with `playlistUrl` for future batch refresh
5. **Creates one `.pgn` per video** — skeleton files with headers only (`*` as movetext)

### Generated PGN Headers

Each skeleton PGN includes:

```pgn
[Event "?"]
[Site "?"]
[Date "2025.04.27"]
[White "?"]
[Black "?"]
[Result "*"]
[VideoURL "https://youtu.be/VIDEO_ID"]
[VideoTitle "Original YouTube video title"]
[VideoPlaylist "Original YouTube playlist title"]
[Language "en"]
```

- `[Date]` is derived from the video's YouTube publish date
- `[VideoTitle]` and `[VideoPlaylist]` preserve the original YouTube titles
- `[Language]` is included only when `--language` is specified

### Incremental Import

The script is **incremental** — it skips videos whose PGN file already exists. Re-running the command on the same playlist only creates files for newly added videos.

### Filename Sanitization

Video titles are sanitized for cross-platform compatibility:

- Unsafe characters (`< > : " / \ | ? *`) are removed
- Emoji are stripped
- Non-breaking spaces and other Unicode whitespace are normalized
- Consecutive spaces are collapsed
- Filenames are capped at 200 characters (word-boundary aware)

## Playlist Metadata

On first import, a `metadata.yaml` is created in the playlist folder:

```yaml
playlistUrl: 'https://www.youtube.com/playlist?list=PLxxx'
```

This file is not overwritten on subsequent imports. You can add extra metadata fields:

```yaml
playlistUrl: 'https://www.youtube.com/playlist?list=PLxxx'
defaults:
  tags: [opening, repertoire]
  difficulty: intermediate
```

These defaults are merged into catalog entries by `build-catalog.ts` (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## Related Scripts

| Script             | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `build-catalog.ts` | Parse PGN files into JSON catalog (`public/catalog/`) |
| `validate-pgn.ts`  | Check all PGN files for required headers              |
