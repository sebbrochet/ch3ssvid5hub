/**
 * One-time script to backfill avatarUrl and channelUrl into existing youtuber metadata.yaml files.
 * Usage: YOUTUBE_API_KEY=... npx tsx scripts/backfill-avatars.ts [--dry-run]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const PGN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pgn');

interface ChannelSnippet {
  customUrl?: string;
  title: string;
  thumbnails?: { default?: { url?: string } };
}

interface ChannelResponse {
  items?: Array<{ snippet: ChannelSnippet }>;
}

async function fetchChannelByHandle(
  handle: string,
  apiKey: string,
): Promise<{ avatarUrl?: string; channelUrl?: string } | null> {
  const url = `${API_BASE}/channels?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`  ✗ API error for @${handle}: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = (await res.json()) as ChannelResponse;
  if (!data.items || data.items.length === 0) {
    console.warn(`  ⚠ No channel found for @${handle}`);
    return null;
  }

  const snippet = data.items[0].snippet;
  return {
    avatarUrl: snippet.thumbnails?.default?.url,
    channelUrl: snippet.customUrl ? `https://www.youtube.com/${snippet.customUrl}` : undefined,
  };
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY environment variable');
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('(dry-run mode — no files will be modified)\n');

  const youtubers = fs
    .readdirSync(PGN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`Found ${youtubers.length} youtuber folder(s)\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const handle of youtubers) {
    const metaPath = path.join(PGN_DIR, handle, 'metadata.yaml');

    if (fs.existsSync(metaPath)) {
      const content = fs.readFileSync(metaPath, 'utf-8');
      if (content.includes('avatarUrl:')) {
        console.log(`  ⏭ ${handle}: already has avatarUrl`);
        skipped++;
        continue;
      }
    }

    const profile = await fetchChannelByHandle(handle, apiKey);
    if (!profile) {
      failed++;
      continue;
    }

    console.log(`  ✓ ${handle}: avatar=${profile.avatarUrl ? 'yes' : 'no'}, channel=${profile.channelUrl ?? 'n/a'}`);

    if (!dryRun) {
      let append = '';
      if (profile.avatarUrl) append += `avatarUrl: '${profile.avatarUrl}'\n`;
      if (profile.channelUrl) append += `channelUrl: '${profile.channelUrl}'\n`;

      if (append) {
        if (fs.existsSync(metaPath)) {
          fs.appendFileSync(metaPath, append, 'utf-8');
        } else {
          fs.mkdirSync(path.dirname(metaPath), { recursive: true });
          fs.writeFileSync(
            metaPath,
            `# yaml-language-server: $schema=https://www.schemastore.org/any.json\n\n${append}`,
            'utf-8',
          );
        }
      }
    }

    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
