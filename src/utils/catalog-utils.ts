import type { CatalogGame } from '../types/catalog';

export type AnnotationFilter = '' | 'has' | 'missing';

/**
 * Filter games by faceted criteria.
 * Array filters match if the game's value is in the array (OR logic within a filter kind).
 */
export function filterGames(
  games: CatalogGame[],
  filters: {
    youtuber?: string[];
    playlist?: string[];
    tag?: string[];
    result?: string[];
    variant?: string[];
    opening?: string[];
    language?: string[];
    moves?: AnnotationFilter;
    timestamps?: AnnotationFilter;
    evals?: AnnotationFilter;
  },
): CatalogGame[] {
  let filtered = games;

  // Youtuber + playlist filters work together: playlist narrows only the
  // youtuber it belongs to. Games from youtubers with no selected playlist
  // pass through if the youtuber itself is selected.
  if (filters.youtuber?.length) {
    const youtubers = filters.youtuber;
    const playlists = filters.playlist ?? [];
    if (playlists.length > 0) {
      // Build set of youtubers that have a playlist selected
      const youtuberOfPlaylist = new Set(filtered.filter((g) => playlists.includes(g.playlist)).map((g) => g.youtuber));
      filtered = filtered.filter((g) => {
        if (!youtubers.includes(g.youtuber)) return false;
        // If this youtuber has playlist filter(s), game must match one
        if (youtuberOfPlaylist.has(g.youtuber)) return playlists.includes(g.playlist);
        // Otherwise, all games from this youtuber pass
        return true;
      });
    } else {
      filtered = filtered.filter((g) => youtubers.includes(g.youtuber));
    }
  } else if (filters.playlist?.length) {
    const values = filters.playlist;
    filtered = filtered.filter((g) => values.includes(g.playlist));
  }
  if (filters.tag?.length) {
    const values = filters.tag;
    filtered = filtered.filter((g) => g.tags.some((t) => values.includes(t)));
  }
  if (filters.result?.length) {
    const values = filters.result;
    filtered = filtered.filter((g) => values.includes(g.result));
  }
  if (filters.variant?.length) {
    const values = filters.variant;
    filtered = filtered.filter((g) => values.includes(g.variant ?? 'Standard'));
  }
  if (filters.opening?.length) {
    const values = filters.opening;
    filtered = filtered.filter((g) => g.opening !== undefined && values.includes(g.opening));
  }
  if (filters.language?.length) {
    const values = filters.language;
    filtered = filtered.filter((g) => values.includes(g.language ?? ''));
  }
  if (filters.moves === 'has') {
    filtered = filtered.filter((g) => g.moveCount > 0);
  } else if (filters.moves === 'missing') {
    filtered = filtered.filter((g) => g.moveCount === 0);
  }
  if (filters.timestamps === 'has') {
    filtered = filtered.filter((g) => g.hasTimestamps);
  } else if (filters.timestamps === 'missing') {
    filtered = filtered.filter((g) => !g.hasTimestamps);
  }
  if (filters.evals === 'has') {
    filtered = filtered.filter((g) => g.hasEvals);
  } else if (filters.evals === 'missing') {
    filtered = filtered.filter((g) => !g.hasEvals);
  }

  return filtered;
}

/**
 * Sort games by the given key.
 */
export function sortGames(games: CatalogGame[], sortBy: string): CatalogGame[] {
  const sorted = [...games];
  switch (sortBy) {
    case 'date':
      return sorted.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    case 'white':
      return sorted.sort((a, b) => a.white.localeCompare(b.white));
    case 'opening':
      return sorted.sort((a, b) => (a.opening ?? '').localeCompare(b.opening ?? ''));
    case 'youtuber':
    default:
      return sorted.sort((a, b) => a.youtuberDisplayName.localeCompare(b.youtuberDisplayName));
  }
}

/**
 * Paginate a list of items.
 */
export function paginate<T>(
  items: T[],
  page: number,
  itemsPerPage: number,
): { pagedItems: T[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedItems = items.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  return { pagedItems, totalPages, safePage };
}

/**
 * Build a truncated list of page numbers with ellipsis gaps.
 * Always shows first, last, and a window of ±siblings around the current page.
 * Returns numbers for page buttons and `null` for ellipsis placeholders.
 */
export function buildPageNumbers(currentPage: number, totalPages: number, siblings: number = 1): (number | null)[] {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = currentPage - siblings; i <= currentPage + siblings; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(null);
    }
    result.push(sorted[i]);
  }
  return result;
}
