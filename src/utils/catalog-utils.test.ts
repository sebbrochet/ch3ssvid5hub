import { describe, it, expect } from 'vitest';
import { filterGames, sortGames, paginate, buildPageNumbers } from './catalog-utils';
import type { CatalogGame } from '../types/catalog';

function makeGame(overrides: Partial<CatalogGame> = {}): CatalogGame {
  return {
    id: 'test-game',
    youtuber: 'TestYoutuber',
    youtuberDisplayName: 'Test Youtuber',
    playlist: 'TestPlaylist',
    playlistDisplayName: 'TestPlaylist',
    fileName: 'test.pgn',
    gameIndex: 0,
    white: 'White Player',
    black: 'Black Player',
    result: '1-0',
    moveCount: 30,
    totalMoveCount: 30,
    hasTimestamps: false,
    hasEvals: false,
    timestampedMoveCount: 0,
    evaluatedMoveCount: 0,
    checkmateMoveCount: 0,
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
    const result = filterGames(games, { youtuber: ['alice'] });
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.youtuber === 'alice')).toBe(true);
  });

  it('filters by tag', () => {
    const result = filterGames(games, { tag: ['endgame'] });
    expect(result).toHaveLength(2);
  });

  it('filters by result', () => {
    const result = filterGames(games, { result: ['1-0'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
  });

  it('filters by variant (Standard matches undefined)', () => {
    const result = filterGames(games, { variant: ['Standard'] });
    expect(result).toHaveLength(2);
  });

  it('filters by variant (Chess960)', () => {
    const result = filterGames(games, { variant: ['Chess960'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g2');
  });

  it('filters by opening', () => {
    const result = filterGames(games, { opening: ['Sicilian'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
  });

  it('combines multiple filters', () => {
    const result = filterGames(games, { youtuber: ['alice'], tag: ['endgame'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g3');
  });

  it('returns empty when no games match', () => {
    const result = filterGames(games, { youtuber: ['nobody'] });
    expect(result).toHaveLength(0);
  });

  it('multi-select youtuber returns games from all selected', () => {
    const result = filterGames(games, { youtuber: ['alice', 'bob'] });
    expect(result).toHaveLength(3);
  });

  it('multi-select result returns games matching any selected result', () => {
    const result = filterGames(games, { result: ['1-0', '0-1'] });
    expect(result).toHaveLength(2);
  });

  it('playlist filter scopes to its youtuber only, other youtubers pass through', () => {
    const data = [
      makeGame({ id: 'a1', youtuber: 'alice', playlist: 'p1' }),
      makeGame({ id: 'a2', youtuber: 'alice', playlist: 'p2' }),
      makeGame({ id: 'b1', youtuber: 'bob', playlist: 'p3' }),
      makeGame({ id: 'b2', youtuber: 'bob', playlist: 'p4' }),
    ];
    // Select both youtubers but only alice's p1 playlist
    const result = filterGames(data, { youtuber: ['alice', 'bob'], playlist: ['p1'] });
    // Should get alice/p1 + all of bob's games
    expect(result).toHaveLength(3);
    expect(result.map((g) => g.id).sort()).toEqual(['a1', 'b1', 'b2']);
  });

  it('filters by moves=has (only games with moves)', () => {
    const data = [makeGame({ id: 'has-moves', moveCount: 10 }), makeGame({ id: 'no-moves', moveCount: 0 })];
    const result = filterGames(data, { moves: 'has' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('has-moves');
  });

  it('filters by moves=missing (only skeletons)', () => {
    const data = [makeGame({ id: 'has-moves', moveCount: 10 }), makeGame({ id: 'no-moves', moveCount: 0 })];
    const result = filterGames(data, { moves: 'missing' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('no-moves');
  });

  it('filters by timestamps=has', () => {
    const data = [makeGame({ id: 'ts', hasTimestamps: true }), makeGame({ id: 'no-ts', hasTimestamps: false })];
    const result = filterGames(data, { timestamps: 'has' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ts');
  });

  it('filters by timestamps=missing', () => {
    const data = [makeGame({ id: 'ts', hasTimestamps: true }), makeGame({ id: 'no-ts', hasTimestamps: false })];
    const result = filterGames(data, { timestamps: 'missing' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('no-ts');
  });

  it('filters by evals=has', () => {
    const data = [makeGame({ id: 'ev', hasEvals: true }), makeGame({ id: 'no-ev', hasEvals: false })];
    const result = filterGames(data, { evals: 'has' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ev');
  });

  it('filters by evals=missing', () => {
    const data = [makeGame({ id: 'ev', hasEvals: true }), makeGame({ id: 'no-ev', hasEvals: false })];
    const result = filterGames(data, { evals: 'missing' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('no-ev');
  });

  it('combines annotation filters with other filters', () => {
    const data = [
      makeGame({ id: 'g1', youtuber: 'alice', hasTimestamps: true, hasEvals: true }),
      makeGame({ id: 'g2', youtuber: 'alice', hasTimestamps: true, hasEvals: false }),
      makeGame({ id: 'g3', youtuber: 'bob', hasTimestamps: true, hasEvals: true }),
    ];
    const result = filterGames(data, { youtuber: ['alice'], evals: 'has' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
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

describe('buildPageNumbers', () => {
  it('returns [1] for single page', () => {
    expect(buildPageNumbers(1, 1)).toEqual([1]);
  });

  it('returns all pages when total is small', () => {
    expect(buildPageNumbers(1, 3)).toEqual([1, 2, 3]);
  });

  it('returns all pages when within sibling range', () => {
    expect(buildPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('truncates end when on first page with many pages', () => {
    expect(buildPageNumbers(1, 20)).toEqual([1, 2, null, 20]);
  });

  it('truncates start when on last page with many pages', () => {
    expect(buildPageNumbers(20, 20)).toEqual([1, null, 19, 20]);
  });

  it('truncates both sides when in the middle', () => {
    expect(buildPageNumbers(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it('does not show ellipsis for adjacent pages', () => {
    // Page 3 of 5: window is [2,3,4], plus first=1 and last=5 → all contiguous
    expect(buildPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows ellipsis only on one side when near start', () => {
    expect(buildPageNumbers(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
  });

  it('shows ellipsis only on one side when near end', () => {
    expect(buildPageNumbers(8, 10)).toEqual([1, null, 7, 8, 9, 10]);
  });

  it('respects custom siblings parameter', () => {
    expect(buildPageNumbers(10, 20, 2)).toEqual([1, null, 8, 9, 10, 11, 12, null, 20]);
  });
});
