import fs from 'node:fs';
import path from 'node:path';

const PGN_DIR = path.resolve('pgn');
const REQUIRED_HEADERS = ['Event', 'White', 'Black', 'Result', 'VideoURL'];
// Headers where "?" is not acceptable
const NO_PLACEHOLDER = ['Event', 'VideoURL'];

interface ParsedGame {
  headers: Record<string, string>;
}

function parsePgnFile(content: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const lines = content.split('\n');
  let headers: Record<string, string> = {};
  let inHeaders = true;
  let hasMoves = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      if (inHeaders && Object.keys(headers).length > 0) {
        inHeaders = false;
      }
      continue;
    }

    if (inHeaders && line.startsWith('[')) {
      const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);
      if (match) {
        headers[match[1]] = match[2];
        continue;
      }
    }

    if (!inHeaders || !line.startsWith('[')) {
      inHeaders = false;
      hasMoves = true;

      if (/(?:1-0|0-1|1\/2-1\/2|\*)$/.test(line)) {
        games.push({ headers });
        headers = {};
        inHeaders = true;
        hasMoves = false;
      }
    }
  }

  if (Object.keys(headers).length > 0 || hasMoves) {
    games.push({ headers });
  }

  return games;
}

function validate(): boolean {
  const allEntries = fs.readdirSync(PGN_DIR, { recursive: true, encoding: 'utf-8' });
  const pgnFiles = allEntries.filter((entry) => entry.endsWith('.pgn')).map((entry) => entry.replace(/\\/g, '/'));

  if (pgnFiles.length === 0) {
    console.error('No PGN files found in pgn/');
    return false;
  }

  let errors = 0;

  for (const relPath of pgnFiles) {
    const parts = relPath.split('/');
    if (parts.length !== 3) {
      console.error(`✗ ${relPath}: must follow <youtuber>/<playlist>/<video>.pgn structure`);
      errors++;
      continue;
    }

    const fullPath = path.join(PGN_DIR, relPath);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      console.error(`✗ ${relPath}: cannot read file`);
      errors++;
      continue;
    }

    let games: ParsedGame[];
    try {
      games = parsePgnFile(content);
    } catch {
      console.error(`✗ ${relPath}: failed to parse PGN`);
      errors++;
      continue;
    }

    if (games.length === 0) {
      console.error(`✗ ${relPath}: no games found`);
      errors++;
      continue;
    }

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const missing = REQUIRED_HEADERS.filter((h) => !game.headers[h]);
      const placeholders = NO_PLACEHOLDER.filter((h) => game.headers[h] === '?');
      const issues = [...missing.map((h) => `missing ${h}`), ...placeholders.map((h) => `${h} is "?"`)];
      if (issues.length > 0) {
        console.error(`✗ ${relPath} game ${i}: ${issues.join(', ')}`);
        errors++;
      }
    }
  }

  if (errors === 0) {
    console.log(`✓ All ${pgnFiles.length} PGN files validated successfully`);
    return true;
  } else {
    console.error(`\n✗ ${errors} validation error(s) found`);
    return false;
  }
}

const ok = validate();
if (!ok) process.exit(1);
