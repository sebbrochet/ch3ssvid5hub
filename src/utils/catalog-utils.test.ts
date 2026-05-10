import { describe, it, expect } from 'vitest';
import { filterGames, sortGames, paginate } from './catalog-utils';
import type { CatalogGame } from '../types/catalog';

function makeGame(overrides: Partial<CatalogGame> = {}): CatalogGame {
  return {
    id: 'test-game',
    youtuber: 'TestYoutuber',
    youtuberDisplayName: 'Test Youtuber',
    playlist: 'TestPlaylist',
    fileName: 'test.pgn',
    gameIndex: 0,
    white: 'White Player',
    black: 'Black Player',
    result: '1-0',
    moveCount: 30,
    hasTimestamps: false,
    tags: ['tactics'],
    ...overrides,
  };
}

const games: CatalogGame[] = [
  makeGame({
    id: 'g1',
    youtuber: 'alice',
    youtuberDisplayName: 'Alice',
    white: 'Kasparov',
    result: '1-0',
    tags: ['tactics'],
    variant: undefined,
    opening: 'Sicilian',
    date: '2024.01.15',
  }),
  makeGame({
    id: 'g2',
    youtuber: 'bob',
    youtuberDisplayName: 'Bob',
    white: 'Carlsen',
    result: '0-1',
    tags: ['endgame'],
    variant: 'Chess960',
    opening: 'French',
    date: '2024.03.20',
  }),
  makeGame({
    id: 'g3',
    youtuber: 'alice',
    youtuberDisplayName: 'Alice',
    white: 'Anand',
    result: '1/2-1/2',
    tags: ['tactics', 'endgame'],
    variant: undefined,
    opening: undefined,
    date: '2024.02.10',
  }),
];

describe('filterGames', () => {
  it('returns all games with empty filters', () => {
    expect(filterGames(games, {})).toHaveLength(3);
  });

  it('filters by youtuber', () => {
    const result = filterGames(games, { youtuber: 'alice' });
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.youtuber === 'alice')).toBe(true);
  });

  it('filters by tag', () => {
    const result = filterGames(games, { tag: 'endgame' });
    expect(result).toHaveLength(2);
  });

  it('filters by result', () => {
    const result = filterGames(games, { result: '1-0' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
  });

  it('filters by variant (Standard matches undefined)', () => {
    const result = filterGames(games, { variant: 'Standard' });
    expect(result).toHaveLength(2);
  });

  it('filters by variant (Chess960)', () => {
    const result = filterGames(games, { variant: 'Chess960' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g2');
  });

  it('filters by opening', () => {
    const result = filterGames(games, { opening: 'Sicilian' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
  });

  it('combines multiple filters', () => {
    const result = filterGames(games, { youtuber: 'alice', tag: 'endgame' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g3');
  });

  it('returns empty when no games match', () => {
    const result = filterGames(games, { youtuber: 'nobody' });
    expect(result).toHaveLength(0);
  });
});

describe('sortGames', () => {
  it('sorts by youtuber display name (default)', () => {
    const result = sortGames(games, 'youtuber');
    expect(result[0].youtuberDisplayName).toBe('Alice');
    expect(result[2].youtuberDisplayName).toBe('Bob');
  });

  it('sorts by date descending', () => {
    const result = sortGames(games, 'date');
    expect(result[0].date).toBe('2024.03.20');
    expect(result[2].date).toBe('2024.01.15');
  });

  it('sorts by white player name', () => {
    const result = sortGames(games, 'white');
    expect(result[0].white).toBe('Anand');
    expect(result[1].white).toBe('Carlsen');
    expect(result[2].white).toBe('Kasparov');
  });

  it('sorts by opening alphabetically (undefined as empty string)', () => {
    const result = sortGames(games, 'opening');
    expect(result[0].opening).toBeUndefined(); // '' sorts first
    expect(result[1].opening).toBe('French');
    expect(result[2].opening).toBe('Sicilian');
  });

  it('defaults to youtuber sort for unknown key', () => {
    const result = sortGames(games, 'unknown');
    expect(result[0].youtuberDisplayName).toBe('Alice');
  });

  it('does not mutate the original array', () => {
    const original = [...games];
    sortGames(games, 'date');
    expect(games.map((g) => g.id)).toEqual(original.map((g) => g.id));
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('returns first page', () => {
    const result = paginate(items, 1, 3);
    expect(result.pagedItems).toEqual([1, 2, 3]);
    expect(result.totalPages).toBe(4);
    expect(result.safePage).toBe(1);
  });

  it('returns middle page', () => {
    const result = paginate(items, 2, 3);
    expect(result.pagedItems).toEqual([4, 5, 6]);
  });

  it('returns last page with partial items', () => {
    const result = paginate(items, 4, 3);
    expect(result.pagedItems).toEqual([10]);
  });

  it('clamps page number above total pages', () => {
    const result = paginate(items, 99, 3);
    expect(result.safePage).toBe(4);
    expect(result.pagedItems).toEqual([10]);
  });

  it('clamps page number below 1', () => {
    const result = paginate(items, 0, 3);
    expect(result.safePage).toBe(1);
    expect(result.pagedItems).toEqual([1, 2, 3]);
  });

  it('handles empty items', () => {
    const result = paginate([], 1, 3);
    expect(result.pagedItems).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.safePage).toBe(1);
  });

  it('handles items fewer than page size', () => {
    const result = paginate([1, 2], 1, 10);
    expect(result.pagedItems).toEqual([1, 2]);
    expect(result.totalPages).toBe(1);
  });
});
