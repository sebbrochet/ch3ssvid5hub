import { describe, it, expect, vi } from 'vitest';
import { buildPgnFileUrl, buildImportUrl, buildFolder, getCh3ssVid5Url } from './import-url';

// Mock import.meta.env
vi.stubGlobal('window', {
  location: {
    origin: 'http://localhost:5175',
    protocol: 'http:',
    hostname: 'localhost',
  },
});

describe('buildFolder', () => {
  it('combines youtuber and playlist', () => {
    expect(buildFolder('agadmator', 'World Championship 2024')).toBe('agadmator/World Championship 2024');
  });

  it('handles special characters', () => {
    expect(buildFolder('user@name', 'playlist/with/slashes')).toBe('user@name/playlist/with/slashes');
  });
});

describe('buildPgnFileUrl', () => {
  it('builds an absolute URL from a relative path', () => {
    const url = buildPgnFileUrl('pgn/agadmator/World%20Championship/game.pgn');
    expect(url).toContain('localhost:5175');
    expect(url).toContain('pgn/agadmator/World%20Championship/game.pgn');
  });

  it('includes BASE_URL in the path', () => {
    const url = buildPgnFileUrl('pgn/test.pgn');
    expect(url).toMatch(/^http:\/\/localhost:5175\//);
  });
});

describe('buildImportUrl', () => {
  it('builds a Ch3ssVid5 import URL with encoded PGN path and folder', () => {
    const url = buildImportUrl('pgn/test/playlist/game.pgn', 'test/playlist');
    expect(url).toContain('pgn=');
    expect(url).toContain('folder=');
    expect(url).toContain('test%2Fplaylist');
  });

  it('properly encodes special characters in PGN path', () => {
    const url = buildImportUrl('pgn/user/Caro-Kann%20Masterclass/game.pgn', 'user/Caro-Kann Masterclass');
    expect(url).toContain(encodeURIComponent('Caro-Kann Masterclass'));
  });
});

describe('getCh3ssVid5Url', () => {
  it('returns localhost URL in dev mode', () => {
    const url = getCh3ssVid5Url();
    expect(url).toContain('localhost:5173');
  });

  it('returns a URL ending with slash', () => {
    const url = getCh3ssVid5Url();
    expect(url.endsWith('/')).toBe(true);
  });
});
