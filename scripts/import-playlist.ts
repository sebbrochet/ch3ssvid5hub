import fs from 'node:fs';
import path from 'node:path';
import config from '../hub.config.js';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlaylistSnippet {
  title: string;
  channelId: string;
}

interface PlaylistResponse {
  items?: Array<{ snippet: PlaylistSnippet }>;
}

interface ChannelSnippet {
  customUrl?: string;
  title: string;
}

interface ChannelResponse {
  items?: Array<{ snippet: ChannelSnippet }>;
}

interface PlaylistItemSnippet {
  title: string;
  resourceId: { videoId: string };
  publishedAt: string;
}

interface PlaylistItemsResponse {
  items?: Array<{ snippet: PlaylistItemSnippet }>;
  nextPageToken?: string;
  pageInfo?: { totalResults: number };
}

interface VideoInfo {
  title: string;
  videoId: string;
  publishedAt: string;
}

interface ImportResult {
  created: number;
  skippedExisting: number;
  skippedPrivate: number;
  errors: number;
}

// ── CLI Argument Parsing ───────────────────────────────────────────────────────

interface CliArgs {
  playlist: string;
  youtuber?: string;
  playlistName?: string;
  language?: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const map = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      flags.add('dry-run');
    } else if (arg.startsWith('--') && i + 1 < args.length) {
      map.set(arg.slice(2), args[++i]);
    }
  }

  const playlist = map.get('playlist');

  if (!playlist) {
    console.error(
      'Usage: npx tsx scripts/import-playlist.ts --playlist <URL_OR_ID> [--youtuber <handle>] [--playlist-name <name>] [--language <code>] [--dry-run]',
    );
    process.exit(1);
  }

  return {
    playlist,
    youtuber: map.get('youtuber'),
    playlistName: map.get('playlist-name'),
    language: map.get('language'),
    dryRun: flags.has('dry-run'),
  };
}

// ── Playlist ID Extraction ─────────────────────────────────────────────────────

export function extractPlaylistId(input: string): string {
  // Direct playlist ID (no URL)
  if (/^[A-Za-z0-9_-]+$/.test(input) && !input.includes('.')) {
    return input;
  }

  try {
    const url = new URL(input);
    const listParam = url.searchParams.get('list');
    if (listParam) return listParam;
  } catch {
    // Not a valid URL — treat as raw ID
  }

  throw new Error(`Cannot extract playlist ID from: ${input}`);
}

// ── Filename Sanitization ──────────────────────────────────────────────────────

const UNSAFE_CHARS = /[<>:"/\\|?*]/g;
const EMOJI = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0E\uFE0F]/gu;
const CONSECUTIVE_SPACES = /\s{2,}/g;
const MAX_FILENAME_LENGTH = 200;

export function sanitizeFilename(title: string): string {
  let name = title.replace(UNSAFE_CHARS, '').replace(EMOJI, '').replace(CONSECUTIVE_SPACES, ' ').trim();

  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.slice(0, MAX_FILENAME_LENGTH);
    const lastSpace = name.lastIndexOf(' ');
    if (lastSpace > MAX_FILENAME_LENGTH * 0.5) {
      name = name.slice(0, lastSpace);
    }
    name = name.trim();
  }

  return name;
}

// ── PGN Generation ─────────────────────────────────────────────────────────────

export function escapePgnString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatPgnDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '????.??.??';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export function generatePgn(
  videoId: string,
  options?: { language?: string; publishedAt?: string; videoTitle?: string; playlistTitle?: string },
): string {
  const date = options?.publishedAt ? formatPgnDate(options.publishedAt) : '????.??.??';
  const headers = [
    '[Event "?"]',
    '[Site "?"]',
    `[Date "${date}"]`,
    '[White "?"]',
    '[Black "?"]',
    '[Result "*"]',
    `[VideoURL "https://youtu.be/${videoId}"]`,
  ];

  if (options?.videoTitle) {
    headers.push(`[VideoTitle "${escapePgnString(options.videoTitle)}"]`);
  }

  if (options?.playlistTitle) {
    headers.push(`[VideoPlaylist "${escapePgnString(options.playlistTitle)}"]`);
  }

  if (options?.language) {
    headers.push(`[Language "${options.language}"]`);
  }

  return headers.join('\n') + '\n\n*\n';
}

// ── YouTube API ────────────────────────────────────────────────────────────────

const API_BASE = 'https://www.googleapis.com/youtube/v3';

interface PlaylistInfo {
  title: string;
  channelId: string;
}

async function fetchPlaylistInfo(playlistId: string, apiKey: string): Promise<PlaylistInfo> {
  const url = `${API_BASE}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API error (playlists.list): ${res.status} ${res.statusText}\n${body}`);
  }

  const data = (await res.json()) as PlaylistResponse;
  if (!data.items || data.items.length === 0) {
    throw new Error(`Playlist not found: ${playlistId}`);
  }

  return {
    title: data.items[0].snippet.title,
    channelId: data.items[0].snippet.channelId,
  };
}

export async function fetchChannelHandle(channelId: string, apiKey: string): Promise<string> {
  const url = `${API_BASE}/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API error (channels.list): ${res.status} ${res.statusText}\n${body}`);
  }

  const data = (await res.json()) as ChannelResponse;
  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const snippet = data.items[0].snippet;
  if (snippet.customUrl) {
    // customUrl is like "@alexbanzea" — strip the @ prefix
    return snippet.customUrl.replace(/^@/, '');
  }

  // Fallback: use channel title with unsafe chars removed
  return sanitizeFilename(snippet.title);
}

const PRIVATE_TITLES = new Set(['Private video', 'Deleted video']);

async function fetchPlaylistItems(playlistId: string, apiKey: string): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `${API_BASE}/playlistItems?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 403 && body.includes('quotaExceeded')) {
        throw new Error('YouTube API quota exceeded. Try again tomorrow or use a different API key.');
      }
      throw new Error(`YouTube API error (playlistItems.list): ${res.status} ${res.statusText}\n${body}`);
    }

    const data = (await res.json()) as PlaylistItemsResponse;

    for (const item of data.items ?? []) {
      videos.push({
        title: item.snippet.title,
        videoId: item.snippet.resourceId.videoId,
        publishedAt: item.snippet.publishedAt,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return videos;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY environment variable is not set.');
    console.error('');
    console.error('To obtain an API key:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create a project and enable "YouTube Data API v3"');
    console.error('  3. Go to APIs & Services → Credentials → Create API Key');
    console.error('');
    console.error('Then set it:');
    console.error('  $env:YOUTUBE_API_KEY = "your-key"    # PowerShell');
    console.error('  export YOUTUBE_API_KEY="your-key"    # bash/zsh');
    process.exit(1);
  }

  const playlistId = extractPlaylistId(args.playlist);

  // Fetch playlist info (title + channel)
  const playlistInfo = await fetchPlaylistInfo(playlistId, apiKey);
  const playlistName = sanitizeFilename(args.playlistName ?? playlistInfo.title);

  // Resolve youtuber handle: use explicit flag or auto-detect from channel
  let youtuber: string;
  if (args.youtuber) {
    youtuber = args.youtuber;
  } else {
    youtuber = await fetchChannelHandle(playlistInfo.channelId, apiKey);

    // Check if an existing pgn/ folder matches (case-insensitive) and preserve its casing
    const pgnDir = path.resolve(config.pgnDir);
    if (fs.existsSync(pgnDir)) {
      const existing = fs.readdirSync(pgnDir).find((d) => d.toLowerCase() === youtuber.toLowerCase());
      if (existing) youtuber = existing;
    }

    console.log(`\nAuto-detected youtuber handle: ${youtuber}`);
  }

  console.log(`\nFetching playlist: "${playlistName}"`);

  // Fetch all videos
  const videos = await fetchPlaylistItems(playlistId, apiKey);
  console.log(`Found ${videos.length} video(s)\n`);

  if (videos.length === 0) {
    console.log('No videos to process.');
    return;
  }

  const outputDir = path.resolve(config.pgnDir, youtuber, playlistName);
  const result: ImportResult = { created: 0, skippedExisting: 0, skippedPrivate: 0, errors: 0 };

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    // Skip private/deleted videos
    if (PRIVATE_TITLES.has(video.title)) {
      console.log(`  ⚠ Skipped: ${video.title} (index ${i})`);
      result.skippedPrivate++;
      continue;
    }

    const filename = sanitizeFilename(video.title) + '.pgn';
    const filePath = path.join(outputDir, filename);

    // Incremental: skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`  – Skipped: Already exists — ${filename}`);
      result.skippedExisting++;
      continue;
    }

    if (args.dryRun) {
      console.log(`  ○ Would create: ${filename}`);
      result.created++;
      continue;
    }

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(
        filePath,
        generatePgn(video.videoId, {
          language: args.language,
          publishedAt: video.publishedAt,
          videoTitle: video.title,
          playlistTitle: playlistInfo.title,
        }),
        'utf-8',
      );
      console.log(`  ✓ Created: ${filename}`);
      result.created++;
    } catch (err) {
      console.error(`  ✗ Error creating ${filename}: ${err instanceof Error ? err.message : err}`);
      result.errors++;
    }
  }

  // Summary
  console.log('');
  const parts: string[] = [];
  if (result.created > 0) parts.push(`${result.created} ${args.dryRun ? 'would be created' : 'created'}`);
  if (result.skippedExisting > 0) parts.push(`${result.skippedExisting} skipped (existing)`);
  if (result.skippedPrivate > 0) parts.push(`${result.skippedPrivate} skipped (private/deleted)`);
  if (result.errors > 0) parts.push(`${result.errors} error(s)`);
  console.log(`Summary: ${parts.join(', ')}`);
  console.log(`Output: ${path.relative(process.cwd(), outputDir)}/`);
}

const isDirectRun = process.argv[1]?.includes('import-playlist');
if (isDirectRun) {
  main().catch((err) => {
    console.error(`\nFatal error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
