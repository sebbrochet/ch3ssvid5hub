/**
 * One-time script to backfill missing playlist metadata.yaml files with playlistUrl.
 * Looks up each youtuber's channel playlists via YouTube API and matches by title.
 * Usage: YOUTUBE_API_KEY=... npx tsx scripts/backfill-playlists.ts [--dry-run]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const PGN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pgn');

const YAML_HEADER = '# yaml-language-server: $schema=https://www.schemastore.org/any.json\n\n';

interface ChannelListResponse {
  items?: Array<{ id: string }>;
}

interface PlaylistSnippet {
  title: string;
}

interface PlaylistListResponse {
  items?: Array<{ id: string; snippet: PlaylistSnippet }>;
  nextPageToken?: string;
}

async function fetchChannelId(handle: string, apiKey: string): Promise<string | null> {
  const url = `${API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  ✗ API error fetching channel for @${handle}: ${res.status}`);
    return null;
  }
  const data = (await res.json()) as ChannelListResponse;
  return data.items?.[0]?.id ?? null;
}

interface PlaylistItemsResponse {
  items?: Array<{ snippet: { playlistId: string } }>;
}

async function fetchAllPlaylists(channelId: string, apiKey: string): Promise<Array<{ id: string; title: string }>> {
  const playlists: Array<{ id: string; title: string }> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId,
      maxResults: '50',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `${API_BASE}/playlists?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`  ✗ API error fetching playlists for channel ${channelId}: ${res.status}`);
      break;
    }

    const data = (await res.json()) as PlaylistListResponse;
    for (const item of data.items ?? []) {
      playlists.push({ id: item.id, title: item.snippet.title });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractVideoId(folderPath: string): string | null {
  const pgnFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.pgn'));
  for (const pgnFile of pgnFiles.slice(0, 5)) {
    const content = fs.readFileSync(path.join(folderPath, pgnFile), 'utf-8');
    const match = content.match(/\[VideoURL\s+"https?:\/\/youtu\.be\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  }
  return null;
}

async function findPlaylistByVideo(
  videoId: string,
  channelPlaylists: Array<{ id: string; title: string }>,
  apiKey: string,
): Promise<{ id: string; title: string } | null> {
  for (const pl of channelPlaylists) {
    const url = `${API_BASE}/playlistItems?part=snippet&playlistId=${encodeURIComponent(pl.id)}&videoId=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as PlaylistItemsResponse;
    if (data.items && data.items.length > 0) {
      return pl;
    }
  }
  return null;
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY environment variable');
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('(dry-run mode — no files will be modified)\n');

  // Find all playlist folders missing metadata.yaml or playlistUrl
  const missing: Array<{ youtuber: string; playlist: string; folderPath: string }> = [];

  for (const youtuberDir of fs.readdirSync(PGN_DIR, { withFileTypes: true })) {
    if (!youtuberDir.isDirectory()) continue;
    const youtuberPath = path.join(PGN_DIR, youtuberDir.name);

    for (const playlistDir of fs.readdirSync(youtuberPath, { withFileTypes: true })) {
      if (!playlistDir.isDirectory()) continue;
      const metaPath = path.join(youtuberPath, playlistDir.name, 'metadata.yaml');

      if (!fs.existsSync(metaPath) || !fs.readFileSync(metaPath, 'utf-8').includes('playlistUrl')) {
        missing.push({
          youtuber: youtuberDir.name,
          playlist: playlistDir.name,
          folderPath: path.join(youtuberPath, playlistDir.name),
        });
      }
    }
  }

  if (missing.length === 0) {
    console.log('All playlist folders already have metadata.yaml with playlistUrl.');
    return;
  }

  console.log(`Found ${missing.length} playlist folder(s) missing playlistUrl\n`);

  // Group by youtuber to minimize API calls
  const byYoutuber = new Map<string, typeof missing>();
  for (const entry of missing) {
    if (!byYoutuber.has(entry.youtuber)) byYoutuber.set(entry.youtuber, []);
    byYoutuber.get(entry.youtuber)!.push(entry);
  }

  let matched = 0;
  let unmatched = 0;
  let apiErrors = 0;

  for (const [handle, entries] of byYoutuber) {
    console.log(`\n${handle}:`);

    // Get channel ID
    const channelId = await fetchChannelId(handle, apiKey);
    if (!channelId) {
      console.error(`  ✗ Could not find channel for @${handle}`);
      apiErrors += entries.length;
      continue;
    }

    // Fetch all playlists for this channel
    const channelPlaylists = await fetchAllPlaylists(channelId, apiKey);
    console.log(`  Found ${channelPlaylists.length} playlist(s) on channel`);

    // Build normalized title index
    const titleIndex = new Map<string, { id: string; title: string }>();
    for (const pl of channelPlaylists) {
      titleIndex.set(normalizeTitle(pl.title), pl);
    }

    // Also read VideoPlaylist headers from PGN files for better matching
    for (const entry of entries) {
      const normalizedFolder = normalizeTitle(entry.playlist);

      // Try exact match on folder name
      let match = titleIndex.get(normalizedFolder);

      // Try matching via VideoPlaylist header from a PGN file
      if (!match) {
        const pgnFiles = fs.readdirSync(entry.folderPath).filter((f) => f.endsWith('.pgn'));
        for (const pgnFile of pgnFiles.slice(0, 3)) {
          const content = fs.readFileSync(path.join(entry.folderPath, pgnFile), 'utf-8');
          const headerMatch = content.match(/\[VideoPlaylist\s+"([^"]+)"\]/);
          if (headerMatch) {
            match = titleIndex.get(normalizeTitle(headerMatch[1]));
            if (match) break;
          }
        }
      }

      if (match) {
        const playlistUrl = `https://www.youtube.com/playlist?list=${match.id}`;
        console.log(`  ✓ ${entry.playlist} → ${match.title} (${match.id})`);

        if (!dryRun) {
          const metaPath = path.join(entry.folderPath, 'metadata.yaml');
          if (fs.existsSync(metaPath)) {
            fs.appendFileSync(metaPath, `playlistUrl: '${playlistUrl}'\n`, 'utf-8');
          } else {
            fs.writeFileSync(metaPath, `${YAML_HEADER}playlistUrl: '${playlistUrl}'\n`, 'utf-8');
          }
        }
        matched++;
      } else {
        // Fallback: find playlist by checking if a video from this folder is in any channel playlist
        const videoId = extractVideoId(entry.folderPath);
        if (videoId) {
          console.log(`    Trying video-based lookup for ${entry.playlist} (videoId: ${videoId})...`);
          const videoMatch = await findPlaylistByVideo(videoId, channelPlaylists, apiKey);
          if (videoMatch) {
            const playlistUrl = `https://www.youtube.com/playlist?list=${videoMatch.id}`;
            console.log(`  ✓ ${entry.playlist} → ${videoMatch.title} (${videoMatch.id}) [via video lookup]`);

            if (!dryRun) {
              const metaPath = path.join(entry.folderPath, 'metadata.yaml');
              if (fs.existsSync(metaPath)) {
                fs.appendFileSync(metaPath, `playlistUrl: '${playlistUrl}'\n`, 'utf-8');
              } else {
                fs.writeFileSync(metaPath, `${YAML_HEADER}playlistUrl: '${playlistUrl}'\n`, 'utf-8');
              }
            }
            matched++;
            continue;
          }
        }
        console.warn(`  ⚠ ${entry.playlist} — no matching playlist found on channel`);
        unmatched++;
      }
    }
  }

  console.log(`\nDone: ${matched} matched, ${unmatched} unmatched, ${apiErrors} API errors`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
