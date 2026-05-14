import { describe, it, expect } from 'vitest';
import {
  extractPlaylistId,
  sanitizeFilename,
  generatePgn,
  parseArgs,
  formatPgnDate,
  escapePgnString,
} from './import-playlist';

// ── extractPlaylistId ──────────────────────────────────────────────────────────

describe('extractPlaylistId', () => {
  it('extracts ID from a full YouTube playlist URL', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLBRObSmbZluSpMhP4joqFR_gKMJFJksK2')).toBe(
      'PLBRObSmbZluSpMhP4joqFR_gKMJFJksK2',
    );
  });

  it('extracts ID from a URL with extra params', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=abc&list=PL12345&index=3')).toBe('PL12345');
  });

  it('returns raw playlist ID as-is', () => {
    expect(extractPlaylistId('PLBRObSmbZluSpMhP4joqFR_gKMJFJksK2')).toBe('PLBRObSmbZluSpMhP4joqFR_gKMJFJksK2');
  });

  it('handles short IDs', () => {
    expect(extractPlaylistId('PL12345')).toBe('PL12345');
  });

  it('throws for invalid input', () => {
    expect(() => extractPlaylistId('https://www.youtube.com/watch?v=abc')).toThrow('Cannot extract playlist ID');
  });

  it('throws for completely invalid URL without list param', () => {
    expect(() => extractPlaylistId('not a valid. input!')).toThrow('Cannot extract playlist ID');
  });
});

// ── sanitizeFilename ───────────────────────────────────────────────────────────

describe('sanitizeFilename', () => {
  it('removes unsafe characters', () => {
    expect(sanitizeFilename('Game: White vs Black | Round 1')).toBe('Game White vs Black Round 1');
  });

  it('collapses consecutive whitespace', () => {
    expect(sanitizeFilename('Title   with   spaces')).toBe('Title with spaces');
  });

  it('trims whitespace', () => {
    expect(sanitizeFilename('  hello world  ')).toBe('hello world');
  });

  it('preserves Unicode letters', () => {
    expect(sanitizeFilename('Défense Française — Partie 3')).toBe('Défense Française — Partie 3');
  });

  it('strips emoji', () => {
    expect(sanitizeFilename("J'AFFRONTE l'OUVERTURE à la MODE 🔥")).toBe("J'AFFRONTE l'OUVERTURE à la MODE");
  });

  it('strips multiple emoji and collapses spaces', () => {
    expect(sanitizeFilename('elle veut me MATER ! 🐙♟️😱')).toBe('elle veut me MATER !');
  });

  it('truncates long names at word boundary', () => {
    const longTitle = 'word '.repeat(50); // 250 chars
    const result = sanitizeFilename(longTitle);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).toBe(result.trim());
  });

  it('handles empty string after sanitization', () => {
    expect(sanitizeFilename('???')).toBe('');
  });

  it('removes all specified special characters', () => {
    expect(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij');
  });

  it('replaces non-breaking spaces with regular spaces', () => {
    expect(sanitizeFilename('attacking\u00A0chess')).toBe('attacking chess');
  });

  it('replaces other Unicode whitespace with regular spaces', () => {
    expect(sanitizeFilename('en\u2009dash\u202Fspace')).toBe('en dash space');
  });
});

// ── generatePgn ────────────────────────────────────────────────────────────────

describe('generatePgn', () => {
  it('generates skeleton PGN with VideoURL', () => {
    const pgn = generatePgn('dQw4w9WgXcQ');
    expect(pgn).toContain('[Event "?"]');
    expect(pgn).toContain('[Date "????.??.??"]');
    expect(pgn).toContain('[White "?"]');
    expect(pgn).toContain('[Black "?"]');
    expect(pgn).toContain('[Result "*"]');
    expect(pgn).toContain('[VideoURL "https://youtu.be/dQw4w9WgXcQ"]');
    expect(pgn).not.toContain('[Language');
    expect(pgn).not.toContain('[VideoTitle');
    expect(pgn).not.toContain('[VideoPlaylist');
    expect(pgn).toMatch(/\n\*\n$/);
  });

  it('includes Language header when provided', () => {
    const pgn = generatePgn('abc123', { language: 'fr' });
    expect(pgn).toContain('[Language "fr"]');
  });

  it('omits Language header when not provided', () => {
    const pgn = generatePgn('abc123');
    expect(pgn).not.toContain('[Language');
  });

  it('includes Date from publishedAt', () => {
    const pgn = generatePgn('abc123', { publishedAt: '2025-03-15T10:00:00Z' });
    expect(pgn).toContain('[Date "2025.03.15"]');
  });

  it('includes VideoTitle when provided', () => {
    const pgn = generatePgn('abc123', { videoTitle: 'My Great Game' });
    expect(pgn).toContain('[VideoTitle "My Great Game"]');
  });

  it('includes all optional headers together', () => {
    const pgn = generatePgn('abc123', {
      language: 'en',
      publishedAt: '2024-12-01T08:30:00Z',
      videoTitle: 'Best Opening Ever',
    });
    expect(pgn).toContain('[Date "2024.12.01"]');
    expect(pgn).toContain('[VideoTitle "Best Opening Ever"]');
    expect(pgn).toContain('[Language "en"]');
  });
  it('escapes double quotes in VideoTitle', () => {
    const pgn = generatePgn('abc123', { videoTitle: 'The "King\'s Indian" Attack' });
    expect(pgn).toContain('[VideoTitle "The \\"King\'s Indian\\" Attack"]');
  });

  it('escapes backslashes in VideoTitle', () => {
    const pgn = generatePgn('abc123', { videoTitle: 'Path\\to\\victory' });
    expect(pgn).toContain('[VideoTitle "Path\\\\to\\\\victory"]');
  });
});

// ── escapePgnString ────────────────────────────────────────────────────────────

describe('escapePgnString', () => {
  it('escapes double quotes', () => {
    expect(escapePgnString('The "best" move')).toBe('The \\"best\\" move');
  });

  it('escapes backslashes', () => {
    expect(escapePgnString('a\\b')).toBe('a\\\\b');
  });

  it('escapes both together', () => {
    expect(escapePgnString('say "hello\\world"')).toBe('say \\"hello\\\\world\\"');
  });

  it('returns plain strings unchanged', () => {
    expect(escapePgnString('Normal title')).toBe('Normal title');
  });
});

// ── formatPgnDate ──────────────────────────────────────────────────────────────

describe('formatPgnDate', () => {
  it('formats ISO date to PGN date', () => {
    expect(formatPgnDate('2025-03-15T10:00:00Z')).toBe('2025.03.15');
  });

  it('handles different times correctly', () => {
    expect(formatPgnDate('2024-01-01T00:00:00Z')).toBe('2024.01.01');
  });

  it('returns unknown date for invalid input', () => {
    expect(formatPgnDate('not-a-date')).toBe('????.??.??');
  });
});

// ── parseArgs ──────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('parses playlist with explicit youtuber', () => {
    const args = parseArgs(['node', 'script', '--playlist', 'PL123', '--youtuber', 'Alex']);
    expect(args).toEqual({
      playlist: 'PL123',
      youtuber: 'Alex',
      playlistName: undefined,
      language: undefined,
      dryRun: false,
    });
  });

  it('parses playlist without youtuber (auto-detect)', () => {
    const args = parseArgs(['node', 'script', '--playlist', 'PL123']);
    expect(args).toEqual({
      playlist: 'PL123',
      youtuber: undefined,
      playlistName: undefined,
      language: undefined,
      dryRun: false,
    });
  });

  it('parses all optional arguments', () => {
    const args = parseArgs([
      'node',
      'script',
      '--playlist',
      'PL123',
      '--youtuber',
      'Alex',
      '--playlist-name',
      'My Playlist',
      '--language',
      'en',
      '--dry-run',
    ]);
    expect(args).toEqual({
      playlist: 'PL123',
      youtuber: 'Alex',
      playlistName: 'My Playlist',
      language: 'en',
      dryRun: true,
    });
  });

  it('exits when --playlist is missing', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    expect(() => parseArgs(['node', 'script', '--youtuber', 'Alex'])).toThrow('exit');
    mockExit.mockRestore();
  });
});
