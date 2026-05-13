import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { Chess } from 'chessops/chess';
import { parseFen, makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import config from '../hub.config.js';

// ── Openings Database ──────────────────────────────────────────────────────────

const openingsDb: Record<string, { eco: string; name: string }> = JSON.parse(
  fs.readFileSync(path.resolve('scripts/openings.json'), 'utf-8'),
);

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedGame {
  headers: Record<string, string>;
  movetext: string;
}

interface YoutuberMeta {
  displayName?: string;
  defaults?: Record<string, unknown>;
}

interface PlaylistMeta {
  defaults?: Record<string, unknown>;
  overrides?: Array<{ file: string; [key: string]: unknown }>;
}

interface CatalogGame {
  id: string;
  youtuber: string;
  youtuberDisplayName: string;
  playlist: string;
  playlistDisplayName: string;
  fileName: string;
  gameIndex: number;
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: string;
  date?: string;
  event?: string;
  eco?: string;
  opening?: string;
  moveCount: number;
  videoTitle?: string;
  hasTimestamps: boolean;
  tags: string[];
  difficulty?: string;
  language?: string;
  annotator?: string;
  variant?: string;
}

interface GameDetail {
  id: string;
  headers: Record<string, string>;
  pgn: string;
  pgnPath: string;
  firstMoves: string;
  startingFen: string;
  description?: string;
}

interface CatalogIndex {
  version: number;
  generatedAt: string;
  totalGames: number;
  games: CatalogGame[];
  tags: string[];
  openings: string[];
  players: string[];
  youtubers: string[];
  annotators: string[];
}

// ── Display Name Cache ─────────────────────────────────────────────────────────

const CACHE_FILE = path.resolve('.display-name-cache.json');

function loadDisplayNameCache(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDisplayNameCache(cache: Record<string, string>): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function fetchDisplayNameFromVideoUrl(videoUrl: string): Promise<string | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { author_name?: string };
    return data.author_name ?? null;
  } catch {
    return null;
  }
}

async function resolveDisplayName(
  handle: string,
  youtuberMeta: YoutuberMeta | null,
  cache: Record<string, string>,
  videoUrls: string[],
): Promise<string> {
  // 1. metadata.yaml override
  if (youtuberMeta?.displayName) return youtuberMeta.displayName;
  // 2. cached value
  if (cache[handle]) return cache[handle];
  // 3. oEmbed fetch using a video URL from this youtuber's PGN files
  for (const videoUrl of videoUrls) {
    const fetched = await fetchDisplayNameFromVideoUrl(videoUrl);
    if (fetched) {
      cache[handle] = fetched;
      return fetched;
    }
  }
  // 4. fallback to handle
  console.warn(`  Could not resolve display name for ${handle}, using handle as fallback`);
  return handle;
}

// ── PGN Parsing ────────────────────────────────────────────────────────────────

function parsePgnFile(content: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const lines = content.split('\n');

  let headers: Record<string, string> = {};
  let movetext = '';
  let inHeaders = true;

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
      movetext += (movetext ? ' ' : '') + line;

      // Check if the game ends with a result token
      if (/(?:1-0|0-1|1\/2-1\/2|\*)$/.test(line)) {
        games.push({ headers, movetext: movetext.trim() });
        headers = {};
        movetext = '';
        inHeaders = true;
      }
    }
  }

  // Handle trailing game without result terminator
  if (Object.keys(headers).length > 0 || movetext.trim()) {
    games.push({ headers, movetext: movetext.trim() });
  }

  return games;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeGameId(youtuber: string, playlist: string, fileName: string, gameIndex: number): string {
  const parts = [youtuber, slugify(playlist), slugify(fileName.replace(/\.pgn$/i, ''))];
  return `${parts.join('-')}-${gameIndex}`;
}

function countMoves(movetext: string): number {
  // Count move number indicators (e.g., "1.", "2.", "15.")
  const moveNumbers = movetext.match(/\d+\./g);
  if (!moveNumbers) return 0;
  // Each move number typically appears once for a pair of half-moves
  // The actual move count is roughly 2x the highest move number, but
  // let's count SAN tokens for accuracy
  const sanTokens = movetext
    .replace(/\{[^}]*\}/g, '') // strip comments
    .replace(/\([^)]*\)/g, '') // strip variations (simple, non-nested)
    .replace(/\d+\.\.\./g, '') // strip "1..."
    .replace(/\d+\./g, '') // strip move numbers
    .replace(/\$\d+/g, '') // strip NAGs
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '') // strip result
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && /^[A-Za-z]/.test(t));
  return sanTokens.length;
}

function hasTimestamps(movetext: string): boolean {
  return /\[%ts\s/.test(movetext);
}

function extractFirstMoves(movetext: string, maxMoves: number = 15): string {
  // Strip comments, variations, NAGs — keep only move numbers and SAN
  const clean = movetext
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\$\d+/g, '')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into tokens and take first N moves
  const tokens = clean.split(' ');
  const result: string[] = [];
  let movesSeen = 0;

  for (const token of tokens) {
    if (/^\d+\./.test(token)) {
      movesSeen++;
      if (movesSeen > maxMoves) break;
    }
    result.push(token);
  }

  return result.join(' ').trim();
}

function parseTags(tagsHeader: string | undefined): string[] {
  if (!tagsHeader) return [];
  return tagsHeader
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

function buildPgnPath(youtuber: string, playlist: string, fileName: string): string {
  const encodedPlaylist = encodeURIComponent(playlist);
  const encodedFile = encodeURIComponent(fileName);
  return `pgn/${youtuber}/${encodedPlaylist}/${encodedFile}`;
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ── Opening Detection ──────────────────────────────────────────────────────────

/** Extract SAN moves from movetext (strip comments, variations, NAGs). */
function extractSanMovesForLookup(movetext: string): string[] {
  return movetext
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\$\d+/g, '')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)$/g, '')
    .replace(/\d+\.{1,3}/g, '')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && /^[A-Za-z]/.test(t));
}

/** Detect opening by replaying moves and matching FEN positions against the openings database. */
function detectOpening(movetext: string, startingFen: string): { eco: string; name: string } | null {
  const sanMoves = extractSanMovesForLookup(movetext);
  const setup = parseFen(startingFen);
  if (setup.isErr) return null;
  const pos = Chess.fromSetup(setup.unwrap());
  if (pos.isErr) return null;
  const position = pos.unwrap();

  let lastMatch: { eco: string; name: string } | null = null;
  const maxMoves = Math.min(sanMoves.length, 30); // check first 30 half-moves

  for (let i = 0; i < maxMoves; i++) {
    const move = parseSan(position, sanMoves[i]);
    if (!move) break;
    position.play(move);

    // Build the position key (board + turn + castling, no counters)
    const fen = makeFen(position.toSetup());
    const fenKey = fen.split(' ').slice(0, 4).join(' ');
    if (openingsDb[fenKey]) {
      lastMatch = openingsDb[fenKey];
    }
  }

  return lastMatch;
}

// ── Video Title Fetching ───────────────────────────────────────────────────────

async function fetchVideoTitle(videoUrl: string): Promise<string | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title ?? null;
  } catch {
    return null;
  }
}

// ── Metadata Loading ───────────────────────────────────────────────────────────

function loadYaml<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content) as T;
  } catch {
    return null;
  }
}

// ── Main Build ─────────────────────────────────────────────────────────────────

async function buildCatalog(): Promise<void> {
  const pgnRoot = path.resolve(config.pgnDir);
  const catalogDir = path.resolve(config.catalogDir);
  const gamesDir = path.join(catalogDir, 'games');

  // Ensure output directories exist
  fs.mkdirSync(gamesDir, { recursive: true });

  // Find all PGN files using Node.js built-in recursive readdir
  const allEntries = fs.readdirSync(pgnRoot, { recursive: true, encoding: 'utf-8' });
  const pgnFiles = allEntries.filter((entry) => entry.endsWith('.pgn')).map((entry) => entry.replace(/\\/g, '/'));

  if (pgnFiles.length === 0) {
    console.warn('No PGN files found in', pgnRoot);
    // Write empty catalog
    const emptyCatalog: CatalogIndex = {
      version: 1,
      generatedAt: new Date().toISOString(),
      totalGames: 0,
      games: [],
      tags: [],
      openings: [],
      players: [],
      youtubers: [],
      annotators: [],
    };
    fs.writeFileSync(path.join(catalogDir, 'index.json'), JSON.stringify(emptyCatalog, null, 2));
    return;
  }

  // Load display name cache
  const displayNameCache = loadDisplayNameCache();
  const allGames: CatalogGame[] = [];
  const allTags = new Set<string>();
  const allOpenings = new Set<string>();
  const allPlayers = new Set<string>();
  const allYoutubers = new Set<string>();
  const allAnnotators = new Set<string>();

  // First pass: collect one VideoURL per youtuber for display name resolution
  const youtuberVideoUrls = new Map<string, string[]>();
  for (const relPath of pgnFiles) {
    const handle = relPath.split('/')[0];
    if (!youtuberVideoUrls.has(handle)) youtuberVideoUrls.set(handle, []);
    // Only read the file if we haven't found a video URL for this youtuber yet
    const urls = youtuberVideoUrls.get(handle)!;
    if (urls.length < 2) {
      const fullPath = path.join(pgnRoot, relPath);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const match = content.match(/\[VideoURL\s+"([^"]+)"\]/);
        if (match) urls.push(match[1]);
      } catch {
        // skip
      }
    }
  }

  // Resolve display names for all youtubers
  const displayNames: Record<string, string> = {};
  for (const [handle, videoUrls] of youtuberVideoUrls) {
    const metaPath = path.join(pgnRoot, handle, 'metadata.yaml');
    const youtuberMeta = loadYaml<YoutuberMeta>(metaPath);
    displayNames[handle] = await resolveDisplayName(handle, youtuberMeta, displayNameCache, videoUrls);
  }

  // Save updated cache
  saveDisplayNameCache(displayNameCache);

  // Process each PGN file
  for (const relPath of pgnFiles) {
    const parts = relPath.split('/');
    if (parts.length !== 3) {
      console.warn(`Skipping ${relPath}: expected <youtuber>/<playlist>/<file>.pgn structure`);
      continue;
    }

    const [youtuber, playlist, fileName] = parts;
    const fullPath = path.join(pgnRoot, relPath);

    // Load playlist-level metadata
    const playlistMetaPath = path.join(pgnRoot, youtuber, playlist, 'metadata.yaml');
    const playlistMeta = loadYaml<PlaylistMeta>(playlistMetaPath);
    const youtuberMetaPath = path.join(pgnRoot, youtuber, 'metadata.yaml');
    const youtuberMeta = loadYaml<YoutuberMeta>(youtuberMetaPath);

    // Parse PGN
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch (err) {
      console.warn(`Cannot read ${fullPath}:`, err);
      continue;
    }

    let parsedGames: ParsedGame[];
    try {
      parsedGames = parsePgnFile(content);
    } catch (err) {
      console.warn(`Cannot parse ${relPath}:`, err);
      continue;
    }

    if (parsedGames.length === 0) {
      console.warn(`No games found in ${relPath}`);
      continue;
    }

    // Validate required headers
    for (const [gi, game] of parsedGames.entries()) {
      const missing = config.requiredHeaders.filter((h) => !game.headers[h]);
      if (missing.length > 0) {
        console.warn(`${relPath} game ${gi}: missing headers: ${missing.join(', ')}`);
      }
    }

    // Build catalog entries
    for (let gi = 0; gi < parsedGames.length; gi++) {
      const game = parsedGames[gi];
      const h = game.headers;

      // Merge metadata: PGN headers > file override > playlist defaults > youtuber defaults
      const fileOverride = playlistMeta?.overrides?.find((o) => o.file === fileName);
      const playlistDefaults = playlistMeta?.defaults ?? {};
      const youtuberDefaults = youtuberMeta?.defaults ?? {};
      const merged = { ...youtuberDefaults, ...playlistDefaults, ...fileOverride };

      const tags = parseTags(h['Tags'] ?? (merged['tags'] as string[] | undefined)?.join(', '));
      const difficulty = h['Difficulty'] ?? (merged['difficulty'] as string | undefined);
      const language = h['Language'] ?? (merged['language'] as string | undefined);
      const annotator = h['Annotator'] ?? (merged['annotator'] as string | undefined);

      const id = makeGameId(youtuber, playlist, fileName, gi);
      const pgnPath = buildPgnPath(youtuber, playlist, fileName);
      const startingFen = h['FEN'] ?? DEFAULT_FEN;

      // Auto-detect opening if not in headers (standard chess only)
      let eco = h['ECO'];
      let opening = h['Opening'];
      if (!opening && !h['Variant']) {
        const detected = detectOpening(game.movetext, startingFen);
        if (detected) {
          eco = eco ?? detected.eco;
          opening = detected.name;
        }
      }

      // Auto-fetch video title if not in headers
      let videoTitle = h['VideoTitle'];
      if (!videoTitle && h['VideoURL']) {
        videoTitle = (await fetchVideoTitle(h['VideoURL'])) ?? undefined;
      }

      const catalogGame: CatalogGame = {
        id,
        youtuber,
        youtuberDisplayName: displayNames[youtuber],
        playlist,
        playlistDisplayName: h['VideoPlaylist'] ?? playlist,
        fileName,
        gameIndex: gi,
        white: h['White'] ?? '?',
        black: h['Black'] ?? '?',
        whiteElo: h['WhiteElo'] ? parseInt(h['WhiteElo'], 10) : undefined,
        blackElo: h['BlackElo'] ? parseInt(h['BlackElo'], 10) : undefined,
        result: h['Result'] ?? '*',
        date: h['Date'],
        event: h['Event'],
        eco,
        opening,
        moveCount: countMoves(game.movetext),
        videoTitle,
        hasTimestamps: hasTimestamps(game.movetext),
        tags,
        difficulty: difficulty as CatalogGame['difficulty'],
        language,
        annotator,
        variant: h['Variant'],
      };

      allGames.push(catalogGame);

      // Collect aggregates
      allYoutubers.add(youtuber);
      tags.forEach((t) => allTags.add(t));
      if (catalogGame.opening) allOpenings.add(catalogGame.opening);
      if (catalogGame.white && catalogGame.white !== '?') allPlayers.add(catalogGame.white);
      if (catalogGame.black && catalogGame.black !== '?') allPlayers.add(catalogGame.black);
      if (annotator) allAnnotators.add(annotator);

      // Write per-game detail JSON
      const detail: GameDetail = {
        id,
        headers: h,
        pgn: game.movetext,
        pgnPath,
        firstMoves: extractFirstMoves(game.movetext),
        startingFen: h['FEN'] ?? DEFAULT_FEN,
        description: (fileOverride?.['description'] as string) ?? undefined,
      };

      fs.writeFileSync(path.join(gamesDir, `${id}.json`), JSON.stringify(detail, null, 2));
    }
  }

  // Write catalog index
  const catalog: CatalogIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalGames: allGames.length,
    games: allGames,
    tags: [...allTags].sort(),
    openings: [...allOpenings].sort(),
    players: [...allPlayers].sort(),
    youtubers: [...allYoutubers].sort(),
    annotators: [...allAnnotators].sort(),
  };

  fs.writeFileSync(path.join(catalogDir, 'index.json'), JSON.stringify(catalog, null, 2));

  // Copy PGN files to public/pgn/ for serving
  const pgnPublicDir = path.resolve(config.pgnPublicDir);
  for (const relPath of pgnFiles) {
    const src = path.join(pgnRoot, relPath);
    const dest = path.join(pgnPublicDir, relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  console.log(`✓ Catalog built: ${allGames.length} games from ${pgnFiles.length} PGN files`);
  console.log(`  Youtubers: ${allYoutubers.size} | Tags: ${allTags.size} | Openings: ${allOpenings.size}`);
}

buildCatalog().catch((err) => {
  console.error('Build catalog failed:', err);
  process.exit(1);
});
